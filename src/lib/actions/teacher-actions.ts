"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation, Exam as ExamTypeFirebase, TeacherStats, MarkSubmissionFirestoreRecord, SubmissionHistoryDisplayItem, ClassInfo, Subject as SubjectType, ClassTeacherData, ClassManagementStudent, GradingScaleItem, ClassAssessment, StudentClassMark, AttendanceData, StudentAttendanceInput, DailyAttendanceRecord, AttendanceHistoryData } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents, getGradingPolicies, getExamById } from '@/lib/actions/dos-actions';
import type { GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp, doc, getDoc, getCountFromServer, FieldPath, updateDoc, setDoc } from "firebase/firestore";
import { subDays } from "date-fns";


interface MarksSubmissionData {
  assessmentId: string; // Composite ID: examDocId_classDocId_subjectDocId
  marks: Array<{ studentId: string; score: number | null }>; // studentId is studentIdNumber
}

function calculateGrade(
  score: number | null,
  maxMarks: number,
  scale: GradingScaleItem[]
): string {
  if (score === null || !maxMarks || scale.length === 0) return 'N/A';
  const percentage = (score / maxMarks) * 100;
  for (const tier of scale) {
    if (percentage >= tier.minScore && percentage <= tier.maxScore) {
      return tier.grade;
    }
  }
  return 'Ungraded'; 
}

export async function getTeacherAssessments(teacherId: string): Promise<Array<{ id: string; name: string; maxMarks: number; subjectId: string; }>> {
    console.log(`[getTeacherAssessments] START - Fetching pending assessments for teacherId: "${teacherId}"`);
    if (!db || !teacherId) return [];

    try {
        const teacher = await getTeacherByIdFromDOS(teacherId);
        if (!teacher || !teacher.subjectsAssigned) return [];

        const generalSettings = await getGeneralSettings();
        const currentTermId = generalSettings.currentTermId;
        if (!currentTermId) {
            console.warn("[getTeacherAssessments] No current term set. Cannot fetch assessments.");
            return [];
        }

        const allExams = await getExams();
        const examsForCurrentTerm = allExams.filter(e => e.termId === currentTermId);
        const allSubjects = await getSubjects();

        const assignedSubjectIds = new Set(teacher.subjectsAssigned.map(sa => sa.subjectId));

        const submittedAssessments = new Set<string>();
        const submissionsQuery = query(collection(db, "markSubmissions"), where("teacherId", "==", teacherId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        submissionsSnapshot.forEach(doc => {
            if (doc.data().dosStatus !== 'Rejected') {
                submittedAssessments.add(doc.data().assessmentId);
            }
        });
        
        const pendingExamsForTeacher: Array<{ id: string; name: string; maxMarks: number; subjectId: string; }> = [];

        examsForCurrentTerm.forEach(exam => {
            // Only consider exams that are assigned to a subject the teacher teaches, or general exams
            if (exam.subjectId && assignedSubjectIds.has(exam.subjectId)) {
                const subject = allSubjects.find(s => s.id === exam.subjectId);
                const assignment = teacher.subjectsAssigned.find(sa => sa.subjectId === exam.subjectId);

                if (subject && assignment && assignment.classIds) {
                    assignment.classIds.forEach(classId => {
                        const compositeId = `${exam.id}_${classId}_${subject.id}`;
                        if (!submittedAssessments.has(compositeId)) {
                            // Check if this specific exam is already in the list to avoid duplicates
                            if(!pendingExamsForTeacher.some(pe => pe.id === exam.id)) {
                                pendingExamsForTeacher.push({
                                    id: exam.id,
                                    name: `${exam.name} (${subject.name})`,
                                    maxMarks: exam.maxMarks,
                                    subjectId: exam.subjectId!,
                                });
                            }
                        }
                    });
                }
            }
        });
        
        return pendingExamsForTeacher.sort((a,b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error(`[getTeacherAssessments] CRITICAL ERROR for teacherId ${teacherId}:`, error);
        return [];
    }
}


export async function submitMarks(teacherId: string, data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log(`[Teacher Action - submitMarks] START - Teacher ID: "${teacherId}", Form Assessment ID (Composite): "${data.assessmentId}"`);
  
  if (!db) {
    console.error("[Teacher Action - submitMarks] CRITICAL_ERROR_DB_NULL: Firestore db object is null. Cannot proceed with submission.");
    return { success: false, message: "Database service not available. Marks could not be saved." };
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.error(`[Teacher Action - submitMarks] INVALID_TEACHER_ID: Received "${teacherId}". Cannot proceed with submission.`);
    return { success: false, message: "Teacher ID is invalid or missing. Marks could not be saved." };
  }
  if (!data.assessmentId || !data.marks) {
    console.error("[Teacher Action - submitMarks] INVALID_SUBMISSION_DATA: Assessment ID or marks missing. Cannot proceed with submission.");
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required. Marks could not be saved." };
  }

  const assessmentDetails = await getAssessmentDetails(data.assessmentId);
  
  if (!assessmentDetails.exam || !assessmentDetails.subject || !assessmentDetails.class) { 
     const errorMessage = `Failed to retrieve full assessment details. Exam: ${!!assessmentDetails.exam}, Subject: ${!!assessmentDetails.subject}, Class: ${!!assessmentDetails.class}.`;
     console.error(`[Teacher Action - submitMarks] ABORTING_SUBMISSION due to incomplete details: ${errorMessage}. Marks not saved.`);
     return { success: false, message: `${errorMessage} Marks not saved.` };
  }

  const marksWithScores = data.marks.filter(m => m.score !== null && m.score !== undefined);
  const studentCount = data.marks.length;
  const studentCountWithScores = marksWithScores.length;
  const totalScore = marksWithScores.reduce((sum, mark) => sum + (mark.score as number), 0);
  const averageScore = studentCountWithScores > 0 ? totalScore / studentCountWithScores : null;

  const submissionPayload: MarkSubmissionFirestoreRecord = {
    teacherId, 
    assessmentId: data.assessmentId, 
    assessmentName: `${assessmentDetails.class.name} - ${assessmentDetails.subject.name} - ${assessmentDetails.exam.name}`, 
    dateSubmitted: Timestamp.now(),
    studentCount,
    averageScore,
    status: 'Pending',
    submittedMarks: data.marks, 
    anomalyExplanations: [],
    dosStatus: 'Pending', 
  };

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    await addDoc(markSubmissionsRef, submissionPayload);
  } catch (error) {
    console.error(`[Teacher Action - submitMarks] FIRESTORE_WRITE_FAILED for composite assessmentId ${data.assessmentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving.";
    return { success: false, message: `Failed to save submission to database: ${errorMessage}` };
  }

  revalidatePath("/teacher/marks/submit");
  revalidatePath("/teacher/marks/history");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/dos/marks-review"); 
  
  return { success: true, message: "Marks submitted successfully. They are now pending D.O.S. review." };
}


interface AssessmentDetailsResult {
    exam: ExamTypeFirebase | null;
    subject: SubjectType | null;
    class: ClassInfo | null;
}

async function getAssessmentDetails(assessmentId: string): Promise<AssessmentDetailsResult> {
    console.log(`[getAssessmentDetails] Called for assessmentId (Composite): "${assessmentId}"`);
    if (!db) {
      console.error("[getAssessmentDetails] CRITICAL_ERROR_DB_NULL: Firestore db object is null. Returning error details.");
      return { exam: null, subject: null, class: null };
    }
    
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.warn(`[getAssessmentDetails] Invalid assessmentId format: ${assessmentId}. Expected examDocId_classDocId_subjectDocId.`);
        return { exam: null, subject: null, class: null };
    }
    const [examId, classId, subjectId] = parts; 
    console.log(`[getAssessmentDetails] Parsed Document IDs - Exam: ${examId}, Class: ${classId}, Subject: ${subjectId} from composite ID ${assessmentId}`);

    try {
        const examDocRef = doc(db, "exams", examId);
        const subjectDocRef = doc(db, "subjects", subjectId);
        const classDocRef = doc(db, "classes", classId);

        console.log(`[getAssessmentDetails] Fetching examDoc: ${examId}, subjectDoc: ${subjectId}, classDoc: ${classId} for composite ID ${assessmentId}`);
        const [examDocSnap, subjectDocSnap, classDocSnap] = await Promise.all([
            getDoc(examDocRef),
            getDoc(subjectDocRef),
            getDoc(classDocRef),
        ]);

        const exam = examDocSnap.exists() ? { id: examDocSnap.id, ...examDocSnap.data() } as ExamTypeFirebase : null;
        const subject = subjectDocSnap.exists() ? { id: subjectDocSnap.id, ...subjectDocSnap.data() } as SubjectType : null;
        const cls = classDocSnap.exists() ? { id: classDocSnap.id, ...classDocSnap.data() } as ClassInfo : null;

        return { exam, subject, class: cls };

    } catch (e) {
        console.error(`[getAssessmentDetails] Firestore error during getDoc operations for composite assessmentId ${assessmentId}:`, e);
        return { exam: null, subject: null, class: null };
    }
}

export async function getStudentsForAssessment(assessmentId: string, stream?: string): Promise<Student[]> {
  console.log(`[getStudentsForAssessment] Called for assessmentId (Composite): ${assessmentId}, Stream: ${stream}`);
  if (!db) {
    console.error("[getStudentsForAssessment] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return [];
  }
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      console.warn(`[getStudentsForAssessment] Invalid assessmentId format: ${assessmentId}. Expected examDocId_classDocId_subjectDocId.`);
      return [];
  }
  const [examId, classId] = parts; 
  console.log(`[getStudentsForAssessment] Extracted class document ID: ${classId} and exam ID: ${examId} from assessmentId: ${assessmentId}`);

  try {
    const exam = await getExamById(examId);
    // This will now get all students for the class regardless of stream. Filtering happens next.
    const allStudentsForClass = await getStudentsForClass(classId); 

    if (exam && exam.stream) {
      // Exam is for a specific stream, this overrides any user selection.
      console.log(`[getStudentsForAssessment] Exam is specific to stream: "${exam.stream}". Filtering ${allStudentsForClass.length} students.`);
      const filteredStudents = allStudentsForClass.filter(student => student.stream === exam.stream);
      console.log(`[getStudentsForAssessment] Found ${filteredStudents.length} students in exam's stream "${exam.stream}".`);
      return filteredStudents;
    } else if (stream) {
      // Exam is for the whole class, but user has selected a stream to filter by.
      console.log(`[getStudentsForAssessment] User selected stream: "${stream}". Filtering ${allStudentsForClass.length} students.`);
       const filteredStudents = allStudentsForClass.filter(student => student.stream === stream);
       console.log(`[getStudentsForAssessment] Found ${filteredStudents.length} students in user-selected stream "${stream}".`);
      return filteredStudents;
    }
    else {
      // Exam is for the whole class, and no stream is selected by user.
      console.log(`[getStudentsForAssessment] Exam is for the whole class. Returning all ${allStudentsForClass.length} students.`);
      return allStudentsForClass;
    }
  } catch(error) {
    console.error(`[getStudentsForAssessment] Error fetching students for assessment ${assessmentId}:`, error);
    return [];
  }
}

export async function getSubmittedMarksHistory(teacherId: string): Promise<SubmissionHistoryDisplayItem[]> {
    console.log(`[getSubmittedMarksHistory] START - Fetching history for teacherId: "${teacherId}"`);
    if (!db) {
        console.error("[getSubmittedMarksHistory] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
        return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
        console.warn(`[getSubmittedMarksHistory] INVALID_TEACHER_ID: Received "${teacherId}". Returning empty array.`);
        return [];
    }
    try {
        const submissionsRef = collection(db, "markSubmissions");
        const q = query(
            submissionsRef,
            where("teacherId", "==", teacherId),
            orderBy("dateSubmitted", "desc")
        );
        const querySnapshot = await getDocs(q);

        console.log(`[getSubmittedMarksHistory] Firestore query executed for teacherId: "${teacherId}". Snapshot empty: ${querySnapshot.empty}, Size: ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            console.log(`[getSubmittedMarksHistory] No submission history found in Firestore for teacherId: ${teacherId}`);
            return [];
        }
        
        const history: SubmissionHistoryDisplayItem[] = [];
        querySnapshot.docs.forEach(docSnap => {
            const docId = docSnap.id;
            const rawData = docSnap.data();

            try {
                const data = rawData as MarkSubmissionFirestoreRecord;
                let displayStatus: string;

                switch(data.dosStatus) {
                    case 'Approved':
                        displayStatus = 'Approved';
                        break;
                    case 'Rejected':
                        displayStatus = 'Rejected';
                        break;
                    case 'Pending':
                    default: 
                        displayStatus = 'Pending D.O.S. Review';
                        break;
                }

                if (!(data.dateSubmitted instanceof Timestamp)) {
                    console.warn(`[getSubmittedMarksHistory] Malformed 'dateSubmitted' for doc ID ${docId}. Expected Firestore Timestamp, got ${typeof data.dateSubmitted}. Record will be skipped or have incorrect date.`);
                }
                if (typeof data.assessmentName !== 'string' || !data.assessmentName) {
                     console.warn(`[getSubmittedMarksHistory] Missing or invalid 'assessmentName' for doc ID ${docId}. It should be a string like "Class - Subject - Exam". Record will use 'N/A - Error'. Value: ${data.assessmentName}`);
                }

                const item: SubmissionHistoryDisplayItem = {
                    id: docId,
                    assessmentName: data.assessmentName || "N/A - Error in Record Name", 
                    dateSubmitted: data.dateSubmitted instanceof Timestamp ? data.dateSubmitted.toDate().toISOString() : new Date(0).toISOString(), 
                    studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
                    averageScore: typeof data.averageScore === 'number' ? data.averageScore : null,
                    status: displayStatus, 
                    dosStatus: data.dosStatus, 
                    dosRejectReason: data.dosRejectReason,
                };
                history.push(item);
            } catch (mapError) {
                console.error(`[getSubmittedMarksHistory] ERROR transforming document ${docId} to SubmissionHistoryDisplayItem:`, mapError, "Raw Data:", rawData);
            }
        });

        console.log(`[getSubmittedMarksHistory] END - Successfully processed ${history.length} history items for teacherId: ${teacherId}`);
        return history;
    } catch (error: any) {
        console.error(`[getSubmittedMarksHistory] CRITICAL ERROR fetching history for teacherId ${teacherId}:`, error);
        if (error.code === 'failed-precondition') {
            console.error("*********************************************************************************");
            console.error("FIRESTORE ERROR (getSubmittedMarksHistory): The query requires an index.");
            console.error("This typically involves 'teacherId' (Ascending) and 'dateSubmitted' (Descending) on the 'markSubmissions' collection.");
            console.error("Please create the required composite index in your Firebase Firestore console.");
            console.error("The full error message from Firebase (containing a direct link to create the index) should be in your server logs.");
            console.error(`Example Index fields: 'teacherId' (Ascending), 'dateSubmitted' (Descending) on 'markSubmissions' collection.`);
            console.error("*********************************************************************************");
        }
        return []; 
    }
}

export async function getSubmissionDetails(submissionId: string): Promise<MarkSubmissionFirestoreRecord | null> {
    if (!db) return null;
    try {
        const submissionRef = doc(db, "markSubmissions", submissionId);
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
            return submissionSnap.data() as MarkSubmissionFirestoreRecord;
        }
        return null;
    } catch (error) {
        console.error("Error fetching submission details:", error);
        return null;
    }
}


async function getTeacherAssessmentResponsibilities(teacherId: string): Promise<Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>> {
  const responsibilitiesMap = new Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>();

  if (!db) {
    console.error("[getTeacherAssessmentResponsibilities] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return responsibilitiesMap;
  }
   if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.warn(`[getTeacherAssessmentResponsibilities] Invalid teacherId received: "${teacherId}". Returning empty map.`);
    return responsibilitiesMap;
  }

  const teacherDocument = await getTeacherByIdFromDOS(teacherId);
  if (!teacherDocument) {
    console.warn(`[getTeacherAssessmentResponsibilities] Teacher not found for ID: "${teacherId}". Returning empty map.`);
    return responsibilitiesMap;
  }

  const [allClasses, allSubjects, allExamsFromSystem, generalSettingsResult] = await Promise.all([
    getClasses(), getSubjects(), getExams(), getGeneralSettings(),
  ]);
  const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;

  const currentTermId = actualGeneralSettings.currentTermId;
  if (!currentTermId) {
    console.warn(`[getTeacherAssessmentResponsibilities] No current term ID set in general settings. Cannot determine responsibilities. General settings isDefault: ${gsIsDefault}, currentTermId from actualGeneralSettings: ${actualGeneralSettings.currentTermId}`);
    return responsibilitiesMap;
  }

  const examsForCurrentTerm = allExamsFromSystem.filter(exam => exam.termId === currentTermId);
  if (examsForCurrentTerm.length === 0) {
    console.warn(`[getTeacherAssessmentResponsibilities] No exams found for current term ID: ${currentTermId}. Teacher responsibilities cannot be determined.`);
    return responsibilitiesMap;
  }
  
  const specificAssignments = Array.isArray(teacherDocument.subjectsAssigned) ? teacherDocument.subjectsAssigned : [];
  specificAssignments.forEach(assignment => {
    const subjectObj = allSubjects.find(s => s.id === assignment.subjectId);
    if(subjectObj && Array.isArray(assignment.classIds)) {
        assignment.classIds.forEach(classId => {
            const classObj = allClasses.find(c => c.id === classId);
            if(classObj) {
                examsForCurrentTerm.forEach(examObj => {
                    // An exam is relevant if it's general OR matches the subject
                    const isRelevantExam = !examObj.subjectId || examObj.subjectId === subjectObj.id;
                    if(isRelevantExam) {
                        const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                        if (!responsibilitiesMap.has(key)) { 
                            responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        }
                    }
                });
            }
        });
    }
  });
  
  // As a class teacher, you are responsible for any subject taught in your class.
  allClasses.forEach(classObj => {
    if (classObj.classTeacherId === teacherDocument.id) {
        // Find all subjects taught in this class by ANY teacher
        const subjectsInClass = new Set<string>();
        specificAssignments.forEach(sa => {
            if (sa.classIds.includes(classObj.id)) {
                subjectsInClass.add(sa.subjectId);
            }
        });

        subjectsInClass.forEach(subjectId => {
            const subjectObj = allSubjects.find(s => s.id === subjectId);
            if (subjectObj) {
                examsForCurrentTerm.forEach(examObj => { 
                    const isRelevantForClassTeacher =
                        (!examObj.classId || examObj.classId === classObj.id) &&
                        (!examObj.subjectId || examObj.subjectId === subjectObj.id);

                    if (isRelevantForClassTeacher) {
                        const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`; 
                        if (!responsibilitiesMap.has(key)) { 
                            responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        }
                    }
                });
            }
        });
    }
  });
  
  return responsibilitiesMap;
}

/**
 * Calculates a teacher's general assignments (classes and subjects)
 * independent of any term or exam schedule. Used for high-level stats.
 */
async function getTeacherCurrentAssignments(teacherId: string): Promise<{ assignedClasses: ClassInfo[]; assignedSubjects: SubjectType[] }> {
    const assignedClassesMap = new Map<string, ClassInfo>();
    const assignedSubjectsMap = new Map<string, SubjectType>();

    if (!db || !teacherId) {
        return { assignedClasses: [], assignedSubjects: [] };
    }

    const teacherDoc = await getTeacherByIdFromDOS(teacherId);
    if (!teacherDoc) {
        return { assignedClasses: [], assignedSubjects: [] };
    }

    const [allClasses, allSubjects] = await Promise.all([
        getClasses(),
        getSubjects(),
    ]);

    // 1. Check for Class Teacher role
    allClasses.forEach((classObj) => {
        if (classObj.classTeacherId === teacherDoc.id) {
            if (!assignedClassesMap.has(classObj.id)) {
                assignedClassesMap.set(classObj.id, classObj);
            }
        }
    });

    // 2. Check for specific subject assignments
    if (Array.isArray(teacherDoc.subjectsAssigned)) {
        teacherDoc.subjectsAssigned.forEach(assignment => {
            const subjectObj = allSubjects.find(s => s.id === assignment.subjectId);
            if (subjectObj && !assignedSubjectsMap.has(subjectObj.id)) {
                assignedSubjectsMap.set(subjectObj.id, subjectObj);
            }
            if(Array.isArray(assignment.classIds)) {
                assignment.classIds.forEach(classId => {
                     const classObj = allClasses.find(c => c.id === classId);
                     if (classObj && !assignedClassesMap.has(classObj.id)) {
                        assignedClassesMap.set(classId, classObj);
                    }
                });
            }
        });
    }

    return { 
        assignedClasses: Array.from(assignedClassesMap.values()),
        assignedSubjects: Array.from(assignedSubjectsMap.values())
    };
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  console.log(`[LOG_TDD] ACTION START for teacherId: "${teacherId}"`);
  let recentSubmissionsCount = 0;
  const defaultStats: TeacherStats = {
    assignedClassesCount: 0,
    subjectsTaughtCount: 0,
    recentSubmissionsCount: 0,
  };
  const defaultResponse: TeacherDashboardData = {
    assignments: [],
    notifications: [],
    teacherName: undefined,
    resourcesText: "Default resources text: Please refer to the school guidelines for teaching materials and policies.",
    stats: defaultStats,
  };

  if (!db) {
    console.error("[LOG_TDD] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return {
      ...defaultResponse,
      notifications: [{ id: 'critical_error_db_null', message: "Critical Error: Database connection failed. Dashboard data cannot be loaded.", type: 'warning' }],
    };
  }

  if (!teacherId || teacherId.trim() === "" || teacherId.toLowerCase() === "undefined" || teacherId === "undefined") {
    console.warn(`[LOG_TDD] Invalid teacherId received: "${teacherId}".`);
    return {
      ...defaultResponse,
      notifications: [{ id: 'error_invalid_teacher_id', message: `Your teacher record could not be loaded. Teacher ID is invalid. (ID used: ${teacherId})`, type: 'warning' }],
    };
  }

  try {
    console.log(`[LOG_TDD] Attempting to fetch teacher document for ID: "${teacherId}"`);
    const teacherDocument = await getTeacherByIdFromDOS(teacherId);

    if (!teacherDocument) {
      console.warn(`[LOG_TDD] Teacher document not found for ID: "${teacherId}".`);
      return {
        ...defaultResponse,
        notifications: [{ id: 'error_teacher_not_found', message: `Your teacher record could not be loaded. Please contact administration. (ID used: ${teacherId})`, type: 'warning' }],
      };
    }
    const teacherName = teacherDocument.name;
    console.log(`[LOG_TDD] Teacher found: ${teacherName}`);

    const [generalSettingsResult, allTerms, allExamsForDeadlineLookup] = await Promise.all([
      getGeneralSettings(),
      getTerms(),
      getExams() 
    ]);
    const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
    console.log(`[LOG_TDD] General settings loaded. isDefaultTemplate: ${gsIsDefault}, currentTermId: ${actualGeneralSettings.currentTermId}`);

    const notifications: TeacherNotification[] = [];
    const resourcesText = actualGeneralSettings.teacherDashboardResourcesText || defaultResponse.resourcesText;
    const resourcesImageUrl = actualGeneralSettings.teacherDashboardResourcesImageUrl;

    if (gsIsDefault) {
        notifications.push({
            id: 'system_settings_missing_critical',
            message: "Critical System Alert: GradeCentral general settings are not configured by the D.O.S. office. Essential features like term-based assignments cannot be determined. Please contact administration immediately.",
            type: 'warning',
        });
        console.warn("[LOG_TDD] General settings are default template. Critical config missing.");
    } else if (!actualGeneralSettings.currentTermId) {
        notifications.push({
            id: 'current_term_not_set_warning',
            message: "System Configuration Alert: The current academic term has not been set by the D.O.S. office. Assignments and deadlines cannot be determined. Please contact administration.",
            type: 'warning',
        });
        console.warn("[LOG_TDD] Current term ID not set in (non-default) general settings.");
    }

    const currentTermId = actualGeneralSettings.currentTermId;
    const currentTerm = currentTermId ? allTerms.find(t => t.id === currentTermId) : null;
    console.log(`[LOG_TDD] Current term determined: ${currentTerm ? currentTerm.name : 'None'}`);

    const allResponsibilitiesMap = currentTermId ? await getTeacherAssessmentResponsibilities(teacherId) : new Map(); 

    // Fetch submitted marks to filter out completed tasks
    const submittedAssessments = new Set<string>();
    if (currentTermId) {
        const submissionsQuery = query(collection(db, "markSubmissions"), where("teacherId", "==", teacherId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        submissionsSnapshot.forEach(doc => {
            const data = doc.data() as MarkSubmissionFirestoreRecord;
            const examId = data.assessmentId.split('_')[0];
            const exam = allExamsForDeadlineLookup.find(e => e.id === examId);
            // Only consider submissions for the current term and that are not rejected
            if (exam && exam.termId === currentTermId && data.dosStatus !== 'Rejected') {
                submittedAssessments.add(data.assessmentId);
            }
        });
    }

    // Filter responsibilities to get pending assignments
    const pendingAssignments: TeacherDashboardAssignment[] = [];
    allResponsibilitiesMap.forEach((resp, key) => {
        if (!submittedAssessments.has(key)) {
            const { classObj, subjectObj, examObj } = resp;
            let deadlineText = "Not set";
            if (examObj.marksSubmissionDeadline) {
                 deadlineText = `Exam (${examObj.name}): ${new Date(examObj.marksSubmissionDeadline).toLocaleDateString()}`;
            } else if (actualGeneralSettings.globalMarksSubmissionDeadline) {
                 deadlineText = `Global: ${new Date(actualGeneralSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
            } else if (currentTerm?.endDate) {
                deadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
            }
            pendingAssignments.push({
                id: `${examObj.id}_${classObj.id}_${subjectObj.id}`, // Use composite key for uniqueness
                className: classObj.name,
                subjectName: subjectObj.name,
                examName: examObj.name,
                nextDeadlineInfo: deadlineText,
            });
        }
    });

    console.log(`[LOG_TDD] Processed ${pendingAssignments.length} dashboard assignments (assessments to submit).`);
    
    // NEW: Decoupled stats calculation using the new helper function
    const { assignedClasses, assignedSubjects } = await getTeacherCurrentAssignments(teacherId);

    try {
      const sevenDaysAgo = subDays(new Date(), 7);
      console.log(`[LOG_TDD] Querying for recent submissions for teacherId: "${teacherId}" since ${sevenDaysAgo.toISOString()}`);
      const submissionsQuery = query(
        collection(db, "markSubmissions"),
        where("teacherId", "==", teacherId),
        where("dateSubmitted", ">=", Timestamp.fromDate(sevenDaysAgo))
      );
      const submissionsSnapshot = await getCountFromServer(submissionsQuery);
      recentSubmissionsCount = submissionsSnapshot.data().count;
      console.log(`[LOG_TDD] Recent submissions count (last 7 days): ${recentSubmissionsCount}`);
    } catch (e: any) {
      console.error(`[LOG_TDD] Error fetching recent submissions count:`, e);
      let errMessage = `Could not fetch recent submission count due to a server error: ${e.message || String(e)}`;
      if (e.code === 'failed-precondition') {
        console.error("*********************************************************************************");
        console.error("FIRESTORE ERROR (Recent Submissions Query): The query requires an index.");
        console.error("PLEASE CREATE THE REQUIRED COMPOSITE INDEX IN YOUR FIREBASE FIRESTORE CONSOLE.");
        console.error("The full error message from Firebase (containing a direct link to create the index) should appear in your server logs when this specific error occurs.");
        console.error("Example Index fields for this query: 'teacherId' (Ascending) AND 'dateSubmitted' (Ascending or Descending) on 'markSubmissions' collection.");
        console.error("*********************************************************************************");
        errMessage = "Could not fetch recent submissions. Firestore Database Index Required. Please check server logs for a Firebase link to create the index (collection: 'markSubmissions', fields: 'teacherId' and 'dateSubmitted').";
      }
       notifications.push({
        id: 'error_fetching_recent_submissions',
        message: errMessage,
        type: 'warning',
      });
      recentSubmissionsCount = 0;
    }

    const stats: TeacherStats = {
      assignedClassesCount: assignedClasses.length,
      subjectsTaughtCount: assignedSubjects.length,
      recentSubmissionsCount: recentSubmissionsCount,
    };
    console.log(`[LOG_TDD] Calculated stats: ${JSON.stringify(stats)}`);

    if (actualGeneralSettings.dosGlobalAnnouncementText) {
      notifications.push({
        id: 'dos_announcement',
        message: actualGeneralSettings.dosGlobalAnnouncementText,
        type: actualGeneralSettings.dosGlobalAnnouncementType || 'info',
        imageUrl: actualGeneralSettings.dosGlobalAnnouncementImageUrl,
      });
    }

    let earliestOverallDeadline: Date | null = null;
    let earliestOverallDeadlineText: string = "Not set";

    if (pendingAssignments.length > 0) { 
        pendingAssignments.forEach(da => {
            const examIdForDeadline = da.id.split('_')[0]; 
            const examForDeadline = allExamsForDeadlineLookup.find(e => e.id === examIdForDeadline && e.termId === currentTermId);
            let assignmentSpecificDeadlineDate: Date | null = null;
            
            if (examForDeadline?.marksSubmissionDeadline) {
                assignmentSpecificDeadlineDate = new Date(examForDeadline.marksSubmissionDeadline);
            } else if (actualGeneralSettings.globalMarksSubmissionDeadline) {
                assignmentSpecificDeadlineDate = new Date(actualGeneralSettings.globalMarksSubmissionDeadline);
            } else if (currentTerm?.endDate) {
                assignmentSpecificDeadlineDate = new Date(currentTerm.endDate);
            }

            if(assignmentSpecificDeadlineDate) {
                if (!earliestOverallDeadline || assignmentSpecificDeadlineDate < earliestOverallDeadline) {
                    earliestOverallDeadline = assignmentSpecificDeadlineDate;
                    if (examForDeadline?.marksSubmissionDeadline) {
                        earliestOverallDeadlineText = `Exam (${examForDeadline.name})`;
                    } else if (actualGeneralSettings.globalMarksSubmissionDeadline) {
                        earliestOverallDeadlineText = `Global Deadline`;
                    } else if (currentTerm?.endDate) {
                        earliestOverallDeadlineText = `Term End`;
                    }
                }
            }
        });
    }


    if (earliestOverallDeadline && currentTermId) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const deadlineForComparison = new Date(earliestOverallDeadline.valueOf());
      deadlineForComparison.setHours(0,0,0,0);

      const diffTime = deadlineForComparison.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) { 
         const deadlineTypeForMessage = earliestOverallDeadlineText.startsWith("Exam") ? "An exam submission deadline"
                                     : earliestOverallDeadlineText.startsWith("Global") ? "The global marks submission deadline"
                                     : "The current term submission deadline";
        const deadlineDateString = earliestOverallDeadline.toLocaleDateString();

        notifications.push({
          id: 'deadline_reminder',
          message: `${deadlineTypeForMessage} for '${earliestOverallDeadlineText}' is ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`} (${deadlineDateString}). Please ensure all marks are submitted.`,
          type: 'deadline',
        });
        console.log(`[LOG_TDD] Added deadline reminder: ${deadlineTypeForMessage}`);
      }
    }

    if (currentTermId && pendingAssignments.length === 0 && allResponsibilitiesMap.size > 0 && !gsIsDefault) {
       notifications.push({
        id: 'all_marks_submitted_info',
        message: "All marks for your assigned assessments in the current term appear to be submitted and are awaiting D.O.S. review or have been approved. Check 'View Submissions' for details.",
        type: 'info',
      });
      console.log(`[LOG_TDD] Added 'all marks submitted' notification.`);
    } else if (currentTermId && allResponsibilitiesMap.size === 0 && !gsIsDefault) { 
        let noAssignmentMessage = 'No teaching assignments found for the current academic term.';
        const examsForThisTerm = allExamsForDeadlineLookup.filter(e => e.termId === currentTermId);
        if (examsForThisTerm.length === 0) {
            noAssignmentMessage = 'No exams are currently scheduled for the current academic term. Assignments cannot be determined.';
        }
        notifications.push({
            id: 'no_assignments_info',
            message: noAssignmentMessage,
            type: 'info',
        });
        console.log(`[LOG_TDD] Added 'no assignments' notification. Message: ${noAssignmentMessage}`);
    }


    console.log(`[LOG_TDD] ACTION END for teacherId: "${teacherId}". Returning data.`);
    return { assignments: pendingAssignments, notifications, teacherName, resourcesText, resourcesImageUrl, stats };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while processing dashboard data.";
    console.error(`[LOG_TDD] CRITICAL ERROR processing dashboard for teacherId ${teacherId}:`, errorMessage, error);
    let teacherNameOnError: string | undefined = undefined;
    try {
      const existingTeacherDoc = await getTeacherByIdFromDOS(teacherId);
      teacherNameOnError = existingTeacherDoc?.name;
    } catch (nestedError) {
      console.error(`[LOG_TDD] Nested error fetching teacher name during error handling for teacherId ${teacherId}:`, nestedError);
    }
    return {
      ...defaultResponse,
      notifications: [{ id: 'processing_error_dashboard', message: `Error processing dashboard data for ${teacherNameOnError || `ID ${teacherId}`}: ${errorMessage}.`, type: 'warning' }],
      teacherName: teacherNameOnError,
      stats: { 
        ...defaultStats,
        recentSubmissionsCount: 0 
      },
    };
  }
}

export async function getTeacherProfileData(teacherId: string): Promise<{ name?: string; email?: string } | null> {
  if (!db) {
    console.error("[getTeacherProfileData] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return null;
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.warn(`[getTeacherProfileData] Invalid teacherId received: "${teacherId}". Returning null.`);
    return null;
  }
  try {
    const teacher = await getTeacherByIdFromDOS(teacherId);
    if (teacher) {
      return { name: teacher.name, email: teacher.email };
    }
    console.warn(`[getTeacherProfileData] No profile data found for teacherId: ${teacherId}`);
    return null;
  } catch (error) {
    console.error(`[getTeacherProfileData] Error fetching profile data for teacherId ${teacherId}:`, error);
    return null;
  }
}

export async function changeTeacherPassword(
  teacherId: string,
  currentPassword?: string, // Made optional to align with types; validation must ensure it's present
  newPassword?: string // Made optional for same reason
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Authentication service is currently unavailable." };
  }
  if (!teacherId || !currentPassword || !newPassword) {
    return { success: false, message: "Teacher ID, current password, and new password are required." };
  }

  // This action can't be implemented securely without Firebase Admin SDK to re-authenticate.
  // The correct flow is handled on the client with Firebase Auth SDK's reauthenticateWithCredential.
  // For now, this server action is deprecated and will return an error.
  console.error("DEPRECATED ACTION: changeTeacherPassword should not be used. Password changes must be handled on the client with Firebase Auth SDK.");
  return { success: false, message: "This function is disabled for security reasons. Password changes should be handled differently."};
}

async function getTodaysAttendanceForClass(classId: string): Promise<AttendanceData | null> {
    if (!db) return null;
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const attendanceRef = doc(db, "attendance", `${classId}_${todayStr}`);
    
    const docSnap = await getDoc(attendanceRef);
    if (!docSnap.exists()) {
        return null; // No attendance taken today
    }

    const record = docSnap.data() as DailyAttendanceRecord;
    const allStudents = await getAllStudents(); // In a real app, cache this
    const studentsInClass = allStudents.filter(s => s.classId === classId);

    const data: AttendanceData = {
        present: 0,
        absent: 0,
        late: 0,
        presentDetails: [],
        absentDetails: [],
        lateDetails: [],
    };

    record.records.forEach(r => {
        const student = studentsInClass.find(s => s.id === r.studentId);
        const studentDetail = { id: r.studentId, name: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student' };

        if (r.status === 'present') {
            data.present++;
            data.presentDetails.push(studentDetail);
        } else if (r.status === 'absent') {
            data.absent++;
            data.absentDetails.push(studentDetail);
        } else if (r.status === 'late') {
            data.late++;
            data.lateDetails.push(studentDetail);
        }
    });

    return data;
}


export async function getClassTeacherManagementData(teacherId: string): Promise<ClassTeacherData[]> {
    if (!db) {
        console.error("[getClassTeacherManagementData] Firestore is not initialized.");
        return [];
    }
    if (!teacherId) {
        console.warn("[getClassTeacherManagementData] Teacher ID is missing.");
        return [];
    }

    try {
        const [
            allClasses,
            allStudents,
            allSubjects,
            allExams,
            generalSettings,
            allGradingPolicies,
            allTeachersDocs
        ] = await Promise.all([
            getClasses(),
            getAllStudents(),
            getSubjects(),
            getExams(),
            getGeneralSettings(),
            getGradingPolicies(),
            getDocs(collection(db, "teachers")) // Fetch all teachers to determine subjects in a class
        ]);
        
        const teacherDoc = await getTeacherByIdFromDOS(teacherId);
        const allTeachers = allTeachersDocs.docs.map(d => d.data() as TeacherType);

        const teacherClasses = allClasses.filter(c => c.classTeacherId === teacherDoc?.id);

        if (teacherClasses.length === 0) {
            return [];
        }

        const currentTermId = generalSettings.currentTermId;
        
        const results = await Promise.all(teacherClasses.map(async (classInfo) => {
            const classAssessments: ClassAssessment[] = [];
            const studentsInClass = allStudents
                .filter(s => s.classId === classInfo.id)
                .map(s => ({ id: s.id, studentIdNumber: s.studentIdNumber, firstName: s.firstName, lastName: s.lastName, stream: s.stream }));

            // Determine subjects taught in this class by ANY teacher
            const subjectsInClass = new Map<string, SubjectType>();
            allTeachers.forEach(teacher => {
                if(teacher.subjectsAssigned){
                    teacher.subjectsAssigned.forEach(sa => {
                        if(sa.classIds.includes(classInfo.id)){
                            const subject = allSubjects.find(s => s.id === sa.subjectId);
                            if(subject && !subjectsInClass.has(subject.id)){
                                subjectsInClass.set(subject.id, subject);
                            }
                        }
                    });
                }
            });

            if(currentTermId){
                const examsForCurrentTerm = allExams.filter(e => e.termId === currentTermId);
                const assessmentIdsToFetch: string[] = [];
                
                subjectsInClass.forEach(subject => {
                    examsForCurrentTerm.forEach(exam => {
                        assessmentIdsToFetch.push(`${exam.id}_${classInfo.id}_${subject.id}`);
                    });
                });
                
                const submissionsByAssessmentId = new Map<string, MarkSubmissionFirestoreRecord>();
                 if (assessmentIdsToFetch.length > 0) {
                    const chunkSize = 30;
                    for (let i = 0; i < assessmentIdsToFetch.length; i += chunkSize) {
                        const chunk = assessmentIdsToFetch.slice(i, i + chunkSize);
                        const q = query(
                            collection(db, "markSubmissions"),
                            where("assessmentId", "in", chunk),
                            where("dosStatus", "==", "Approved")
                        );
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach(doc => {
                            submissionsByAssessmentId.set(doc.data().assessmentId, doc.data() as MarkSubmissionFirestoreRecord);
                        });
                    }
                }
                
                subjectsInClass.forEach(subject => {
                    examsForCurrentTerm.forEach(exam => {
                        const assessmentId = `${exam.id}_${classInfo.id}_${subject.id}`;
                        const submission = submissionsByAssessmentId.get(assessmentId);
                        if (submission && submission.submittedMarks) {
                             const gradingPolicy = allGradingPolicies.find(p => p.id === exam.gradingPolicyId) || allGradingPolicies.find(p => p.isDefault);
                             const gradingScale = gradingPolicy?.scale || generalSettings.defaultGradingScale || [];
                             const marks: StudentClassMark[] = submission.submittedMarks.map(mark => {
                                const studentInfo = allStudents.find(s => s.studentIdNumber === mark.studentId);
                                return {
                                    studentId: studentInfo?.id || 'unknown',
                                    studentIdNumber: mark.studentId,
                                    studentName: studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : "Unknown Student",
                                    score: mark.score,
                                    grade: calculateGrade(mark.score, exam.maxMarks, gradingScale),
                                };
                            });
                            
                            const scores = marks.map(m => m.score).filter((s): s is number => s !== null);
                            const summary = scores.length > 0 ? {
                                average: scores.reduce((a, b) => a + b, 0) / scores.length,
                                highest: Math.max(...scores),
                                lowest: Math.min(...scores),
                                submissionCount: scores.length
                            } : { average: 0, highest: 0, lowest: 0, submissionCount: 0 };
                            
                            const gradeDistributionMap = new Map<string, number>();
                            marks.forEach(m => gradeDistributionMap.set(m.grade, (gradeDistributionMap.get(m.grade) || 0) + 1));
                            const gradeDistribution = Array.from(gradeDistributionMap.entries()).map(([grade, count]) => ({ grade, count }));

                            classAssessments.push({
                                examId: exam.id, examName: exam.name, subjectId: subject.id, subjectName: subject.name,
                                maxMarks: exam.maxMarks, marks, summary, gradeDistribution,
                            });
                        }
                    });
                });
            }

            const attendanceData = await getTodaysAttendanceForClass(classInfo.id);

            return {
                classInfo,
                students: studentsInClass,
                assessments: classAssessments.sort((a,b) => a.examName.localeCompare(b.examName) || a.subjectName.localeCompare(b.subjectName)),
                attendance: attendanceData,
            };
        }));
        
        return results;

    } catch (error) {
        console.error(`Error fetching class management data for teacher ${teacherId}:`, error);
        return [];
    }
}

export async function getClassesForTeacher(teacherId: string, includeAllTeachingClasses: boolean = false): Promise<ClassInfo[]> {
    if (!db) return [];
    const allClasses = await getClasses();
    const teacher = await getTeacherByIdFromDOS(teacherId);
    if (!teacher) return [];

    const assignedClasses = new Map<string, ClassInfo>();

    // Add classes where they are the main class teacher
    allClasses.forEach(c => {
        if (c.classTeacherId === teacher.id) {
            assignedClasses.set(c.id, c);
        }
    });

    // If requested, also add classes where they just teach a subject
    if (includeAllTeachingClasses && teacher.subjectsAssigned) {
        teacher.subjectsAssigned.forEach(sa => {
            sa.classIds.forEach(classId => {
                if (!assignedClasses.has(classId)) {
                    const classInfo = allClasses.find(c => c.id === classId);
                    if (classInfo) {
                        assignedClasses.set(classId, classInfo);
                    }
                }
            });
        });
    }
    
    return Array.from(assignedClasses.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStudentsForClass(classId: string, stream?: string): Promise<Student[]> {
  if (!db) return [];
  let studentQuery;
  if (stream) {
      studentQuery = query(collection(db, "students"), where("classId", "==", classId), where("stream", "==", stream));
  } else {
      studentQuery = query(collection(db, "students"), where("classId", "==", classId));
  }
  const snapshot = await getDocs(studentQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}


export async function saveAttendance(data: StudentAttendanceInput): Promise<{ success: boolean; message: string }> {
  if (!db) return { success: false, message: "Database not initialized." };

  try {
    const docId = `${data.classId}_${data.date}`;
    const attendanceRef = doc(db, "attendance", docId);
    
    const recordToSave: DailyAttendanceRecord = {
        classId: data.classId,
        teacherId: data.teacherId,
        date: data.date,
        records: data.records,
        lastUpdatedAt: Timestamp.now()
    };
    
    await setDoc(attendanceRef, recordToSave, { merge: true });

    revalidatePath(`/teacher/class-management`);
    revalidatePath(`/teacher/attendance`);
    revalidatePath(`/teacher/attendance/history`);
    return { success: true, message: "Attendance saved." };

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error.";
    console.error("Error saving attendance:", error);
    return { success: false, message: `Failed to save attendance: ${msg}` };
  }
}

export async function getAttendanceHistory(classId: string, startDate: string, endDate: string): Promise<AttendanceHistoryData[]> {
    if (!db) {
        console.error("[getAttendanceHistory] Firestore not initialized.");
        throw new Error("Database not initialized.");
    }
    
    try {
        const q = query(
            collection(db, "attendance"),
            where("classId", "==", classId),
            where("date", ">=", startDate),
            where("date", "<=", endDate),
            orderBy("date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        const allStudents = await getAllStudents();
        const studentMap = new Map(allStudents.map(s => [s.id, s]));

        const history: AttendanceHistoryData[] = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data() as DailyAttendanceRecord;
            if(data && Array.isArray(data.records)) {
                data.records.forEach(record => {
                    const student = studentMap.get(record.studentId);
                    history.push({
                        date: data.date,
                        studentId: record.studentId,
                        studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown Student",
                        status: record.status
                    });
                });
            }
        });
        
        // Manual sort in code instead of relying on index
        history.sort((a, b) => b.date.localeCompare(a.date));

        return history;
    } catch (error: any) {
        const firestoreErrorMessage = error.message || "An unknown error occurred while fetching attendance data.";
        console.error("*********************************************************************************");
        console.error("FIRESTORE ERROR (getAttendanceHistory):", firestoreErrorMessage);
        if (error.code === 'failed-precondition') {
            console.error("A composite index is required for this query. The error message below should contain a direct link to create it in the Firebase Console.");
             throw new Error(firestoreErrorMessage);
        }
        console.error("*********************************************************************************");
        throw new Error(`Failed to fetch attendance history: ${firestoreErrorMessage}`);
    }
}
