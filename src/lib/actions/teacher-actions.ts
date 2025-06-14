
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation, Exam as ExamTypeFirebase, TeacherStats } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams as getAllExamsFromDOS, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents } from '@/lib/actions/dos-actions';
import type { ClassInfo, Subject as SubjectType, GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp, doc, getCountFromServer } from "firebase/firestore";
import { subDays } from "date-fns";


interface MarksSubmissionData {
  assessmentId: string;
  marks: Array<{ studentId: string; score: number }>; // score should be number by this point
}

interface SubmissionHistoryItem {
  id: string;
  assessmentName: string;
  dateSubmitted: string;
  studentCount: number;
  averageScore: number | null;
  status: "Pending Review (Anomaly Detected)" | "Accepted" | "Rejected";
}


export async function loginTeacherByEmailPassword(email: string, passwordToVerify: string): Promise<{ success: boolean; message: string; teacher?: { id: string; name: string; email: string; } }> {
  console.log(`[Teacher Login Action] Attempting login for email: ${email}`);
  if (!db) {
    console.error("CRITICAL: Firestore database (db) is not initialized in loginTeacherByEmailPassword. Check Firebase configuration.");
    return { success: false, message: "Authentication service is currently unavailable. Please try again later." };
  }
  try {
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`[Teacher Login Action] No teacher found with email: ${email}`);
      return { success: false, message: "Invalid email or password." }; // Generic message for security
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data() as TeacherType;
    console.log(`[Teacher Login Action] Teacher document found for email ${email}. ID: ${teacherDoc.id}, Name: ${teacherData.name}`);

    if (!teacherData.password) {
        console.error(`[Teacher Login Action] Password not set for teacher with email ${email} (ID: ${teacherDoc.id}). Login failed.`);
        return { success: false, message: "Password not set for this account. Please contact D.O.S." };
    }
    if (!teacherDoc.id || !teacherData.name || !teacherData.email) {
        console.error(`[Teacher Login Action] Teacher document (ID: ${teacherDoc.id}) is missing id, name, or email. Login failed.`, {id: teacherDoc.id, name: teacherData.name, email: teacherData.email});
        return { success: false, message: "Teacher account data is incomplete. Cannot log in." };
    }

    if (teacherData.password === passwordToVerify) {
      console.log(`[Teacher Login Action] Password match for teacher ${teacherData.name} (ID: ${teacherDoc.id}). Login successful.`);
      return {
        success: true,
        message: "Login successful.",
        teacher: {
          id: teacherDoc.id,
          name: teacherData.name,
          email: teacherData.email,
        }
      };
    } else {
      console.warn(`[Teacher Login Action] Password mismatch for teacher ${teacherData.name} (ID: ${teacherDoc.id}). Login failed.`);
      return { success: false, message: "Invalid email or password." }; // Generic message
    }
  } catch (error) {
    console.error("[Teacher Login Action] FATAL ERROR during teacher login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown internal server error occurred.";
    return { success: false, message: `Login failed due to a server error: ${errorMessage}. Please try again or contact support if the issue persists.` };
  }
}


export async function submitMarks(teacherId: string, data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log(`[Teacher Action - submitMarks] Called for teacherId: ${teacherId}, assessmentId: ${data.assessmentId}`);
  if (!db) {
    console.error("CRITICAL_ERROR_DB_NULL: Firestore database (db) is not initialized in submitMarks.");
    return { success: false, message: "Database service not available. Marks could not be saved." };
  }
  if (!teacherId) {
    console.error("SUBMIT_MARKS_ERROR: Teacher ID is missing.");
    return { success: false, message: "Teacher ID is missing. Marks could not be saved." };
  }
  if (!data.assessmentId || !data.marks) {
    console.error("SUBMIT_MARKS_ERROR: Invalid submission data. Assessment ID and marks are required.");
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required. Marks could not be saved." };
  }

  console.log(`[Teacher Action - submitMarks] Attempting to submit marks for teacherId: ${teacherId}, assessmentId: ${data.assessmentId}`);

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  const assessmentDetails = await getAssessmentDetails(data.assessmentId);

  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName) {
        console.warn("SUBMIT_MARKS_WARNING: Could not retrieve subject name or exam name for anomaly detection for assessmentId:", data.assessmentId);
    } else {
        const anomalyInput: GradeAnomalyDetectionInput = {
          subject: assessmentDetails.subjectName,
          exam: assessmentDetails.examName,
          grades: gradeEntries,
          historicalAverage: assessmentDetails.historicalAverage,
        };
        
        try {
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
        } catch (error) {
            console.error("SUBMIT_MARKS_ERROR: Error during anomaly detection:", error);
            anomalyResult = { hasAnomalies: true, anomalies: [{studentId: "SYSTEM_ERROR", explanation: `Anomaly check failed: ${error instanceof Error ? error.message : String(error)}`}] };
        }
    }
  }
  
  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;
  
  const initialStatus: SubmissionHistoryItem['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";

  const submissionPayload = {
    teacherId,
    assessmentId: data.assessmentId,
    assessmentName: assessmentDetails.name, 
    dateSubmitted: Timestamp.now(), 
    studentCount,
    averageScore,
    status: initialStatus,
    submittedMarks: data.marks, 
    anomalyExplanations: anomalyResult?.anomalies || [],
  };

  console.log("[Teacher Action - submitMarks] Payload to be saved to Firestore 'markSubmissions':", JSON.stringify(submissionPayload, null, 2));

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    const docRef = await addDoc(markSubmissionsRef, submissionPayload);
    console.log(`[Teacher Action - submitMarks] Marks successfully saved to Firestore. Document ID: ${docRef.id}`);
  } catch (error) {
    console.error("[Teacher Action - submitMarks] CRITICAL_ERROR_FIRESTORE_SAVE: Error saving mark submission to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving.";
    return { success: false, message: `Failed to save submission: ${errorMessage}` };
  }

  revalidatePath(`/teacher/marks/submit?teacherId=${teacherId}`); 
  revalidatePath(`/teacher/marks/history?teacherId=${teacherId}`); 
  revalidatePath(`/dos/marks-review`); 
  revalidatePath(`/teacher/dashboard?teacherId=${teacherId}`);
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number; historicalAverage?: number }> {
    if (!db) {
      console.error("CRITICAL: Firestore 'db' is null in getAssessmentDetails. Firebase not initialized.");
      return { subjectName: "Error: DB Uninitialized", examName: "Error: DB Uninitialized", name: "Error: DB Uninitialized", maxMarks: 100 };
    }
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.error(`Invalid assessmentId format: ${assessmentId}`);
        return { subjectName: "Unknown Subject", examName: "Unknown Exam", name: "Unknown Assessment", maxMarks: 100 };
    }
    const [examId, classId, subjectId] = parts;

    const [allExams, allSubjects, allClasses] = await Promise.all([
      getAllExamsFromDOS(),
      getSubjects(),
      getClasses()
    ]);
    
    const exam = allExams.find(e => e.id === examId);
    const subject = allSubjects.find(s => s.id === subjectId);
    const cls = allClasses.find(c => c.id === classId);

    const assessmentName = `${cls?.name || 'Unknown Class'} - ${subject?.name || 'Unknown Subject'} - ${exam?.name || 'Unknown Exam'}`;
    
    const historicalAverage = undefined; 

    return {
        subjectName: subject?.name || "Unknown Subject",
        examName: exam?.name || "Unknown Exam",
        name: assessmentName,
        maxMarks: exam?.maxMarks || 100,
        historicalAverage: historicalAverage,
    };
}

export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  if (!db) {
    console.error("CRITICAL: Firestore 'db' is null in getStudentsForAssessment. Firebase not initialized.");
    return [];
  }
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      console.error(`Invalid assessmentId format for fetching students: ${assessmentId}`);
      return [];
  }
  const classId = parts[1];

  const allStudents = await getAllStudents(); 
  return allStudents.filter(student => student.classId === classId);
}

export async function getSubmittedMarksHistory(teacherId: string): Promise<SubmissionHistoryItem[]> {
    if (!db) {
        console.error("CRITICAL: Firestore 'db' is null in getSubmittedMarksHistory. Firebase not initialized.");
        return [];
    }
    if (!teacherId) {
        console.warn("[Teacher Action - getSubmittedMarksHistory] Called without teacherId. Returning empty history.");
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

        if (querySnapshot.empty) {
            console.log(`[Teacher Action - getSubmittedMarksHistory] No submission history found for teacherId: ${teacherId}`);
            return [];
        }

        const history: SubmissionHistoryItem[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                assessmentName: data.assessmentName || "N/A",
                dateSubmitted: (data.dateSubmitted as Timestamp).toDate().toISOString(),
                studentCount: data.studentCount || 0,
                averageScore: data.averageScore !== undefined ? data.averageScore : null,
                status: data.status || "Unknown",
            } as SubmissionHistoryItem;
        });
        console.log(`[Teacher Action - getSubmittedMarksHistory] Found ${history.length} submission(s) for teacherId: ${teacherId}`);
        return history;
    } catch (error) {
        console.error(`[Teacher Action - getSubmittedMarksHistory] Error fetching submission history for teacherId ${teacherId}:`, error);
        return [];
    }
}

async function getTeacherAssessmentResponsibilities(teacherId: string): Promise<Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>> {
    const responsibilitiesMap = new Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>();
    if (!db) {
        console.error("CRITICAL_ERROR_DB_NULL: Firestore db object is null in getTeacherAssessmentResponsibilities.");
        return responsibilitiesMap;
    }
    console.log(`[getTeacherAssessmentResponsibilities] Starting for teacherId: ${teacherId}`);

    const teacherDocument = await getTeacherByIdFromDOS(teacherId);
    if (!teacherDocument) {
        console.warn(`[getTeacherAssessmentResponsibilities] Teacher not found for ID: ${teacherId}. Returning empty map.`);
        return responsibilitiesMap;
    }

    const [allClasses, generalSettings, allExamsFromSystem, allSubjectsGlobal] = await Promise.all([
        getClasses(), getGeneralSettings(), getAllExamsFromDOS(), getSubjects(),
    ]);

    const currentTermId = generalSettings.currentTermId;
    if (!currentTermId) {
        console.warn("[getTeacherAssessmentResponsibilities] No current term ID set. Cannot determine responsibilities.");
        return responsibilitiesMap;
    }

    const examsForCurrentTerm = allExamsFromSystem.filter(exam => exam.termId === currentTermId);
    if (examsForCurrentTerm.length === 0) {
        console.warn(`[getTeacherAssessmentResponsibilities] No exams found for current term ID: ${currentTermId}.`);
        return responsibilitiesMap;
    }
    console.log(`[getTeacherAssessmentResponsibilities] Exams for current term (${currentTermId}): ${examsForCurrentTerm.length}`);

    // 1. Process Specific Subject Assignments from teacher.subjectsAssigned array (most explicit)
    const specificAssignments = Array.isArray(teacherDocument.subjectsAssigned) ? teacherDocument.subjectsAssigned : [];
    console.log(`[getTeacherAssessmentResponsibilities] Processing ${specificAssignments.length} specific assignments from teacher doc.`);
    specificAssignments.forEach(assignment => {
        const classObj = allClasses.find(c => c.id === assignment.classId);
        const subjectObj = allSubjectsGlobal.find(s => s.id === assignment.subjectId);
        if (classObj && subjectObj && Array.isArray(assignment.examIds)) {
            assignment.examIds.forEach(assignedExamId => {
                const examObj = examsForCurrentTerm.find(e => e.id === assignedExamId);
                if (examObj) {
                    const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                    responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                    console.log(`[getTeacherAssessmentResponsibilities] Added via specific assignment: ${key}`);
                }
            });
        }
    });

    // 2. Process Class Teacher Role
    console.log(`[getTeacherAssessmentResponsibilities] Processing Class Teacher roles for teacher ${teacherId}.`);
    allClasses.forEach(classObj => {
        if (classObj.classTeacherId === teacherId && Array.isArray(classObj.subjects)) {
            classObj.subjects.forEach(subjectObj => {
                examsForCurrentTerm.forEach(examObj => {
                    // Check if this exam is overly specific and shouldn't apply via class teacher role
                    if (examObj.teacherId && examObj.teacherId !== teacherId) return; 
                    if (examObj.classId && examObj.classId !== classObj.id) return; 
                    if (examObj.subjectId && examObj.subjectId !== subjectObj.id) return;

                    const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                     // Specific assignments take precedence
                    if (!responsibilitiesMap.has(key)) {
                        responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        console.log(`[getTeacherAssessmentResponsibilities] Added via Class Teacher role: ${key}`);
                    }
                });
            });
        }
    });
    
    // 3. Process Exams directly assigned to this teacher on the Exam document itself
    console.log(`[getTeacherAssessmentResponsibilities] Processing exams directly assigned to teacher ${teacherId}.`);
    examsForCurrentTerm.forEach(examObj => {
        if (examObj.teacherId === teacherId) {
            const classForExam = examObj.classId ? allClasses.find(c => c.id === examObj.classId) : null;
            const subjectForExam = examObj.subjectId ? allSubjectsGlobal.find(s => s.id === examObj.subjectId) : null;

            if (classForExam && subjectForExam) { // Most specific: exam assigned to teacher, class, and subject
                const key = `${examObj.id}_${classForExam.id}_${subjectForExam.id}`;
                responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: subjectForExam, examObj }); 
                console.log(`[getTeacherAssessmentResponsibilities] Added/Overridden via direct exam assignment (TCS): ${key}`);
            } else if (classForExam && !subjectForExam) { // Exam assigned to teacher and class (applies to all subjects they teach in that class)
                 const subjectsTeacherIsResponsibleForInThisClass = new Set<string>();
                 if(classForExam.classTeacherId === teacherId) {
                    classForExam.subjects.forEach(s => subjectsTeacherIsResponsibleForInThisClass.add(s.id));
                 }
                 specificAssignments.forEach(sa => {
                    if (sa.classId === classForExam.id) subjectsTeacherIsResponsibleForInThisClass.add(sa.subjectId);
                 });
                 subjectsTeacherIsResponsibleForInThisClass.forEach(subId => {
                    const actualSubjectObj = allSubjectsGlobal.find(s => s.id === subId);
                    if (actualSubjectObj) {
                        const key = `${examObj.id}_${classForExam.id}_${actualSubjectObj.id}`;
                        responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: actualSubjectObj, examObj });
                        console.log(`[getTeacherAssessmentResponsibilities] Added/Overridden via direct exam assignment (TC - for subject ${actualSubjectObj.name}): ${key}`);
                    }
                 });
            } else if (!classForExam && subjectForExam) { // Exam assigned to teacher and subject (applies to all classes they teach that subject in)
                 allClasses.forEach(c => {
                    let teacherTeachesThisSubjectInThisClass = false;
                    if (c.classTeacherId === teacherId && c.subjects.some(s => s.id === subjectForExam.id)) {
                        teacherTeachesThisSubjectInThisClass = true;
                    } else {
                        if (specificAssignments.some(sa => sa.classId === c.id && sa.subjectId === subjectForExam.id)) {
                            teacherTeachesThisSubjectInThisClass = true;
                        }
                    }
                    if (teacherTeachesThisSubjectInThisClass) {
                        const key = `${examObj.id}_${c.id}_${subjectForExam.id}`;
                        responsibilitiesMap.set(key, { classObj: c, subjectObj: subjectForExam, examObj });
                        console.log(`[getTeacherAssessmentResponsibilities] Added/Overridden via direct exam assignment (TS - for class ${c.name}): ${key}`);
                    }
                 });
            } else if (!classForExam && !subjectForExam) { // Exam assigned only to this teacher (general for them)
                 // This exam applies to ALL class-subject pairs the teacher is ALREADY known to be responsible for
                 // This means it will apply to things derived from Class Teacher role and specific assignments
                 const existingClassSubjectPairs = new Map<string, {classObj: ClassInfo, subjectObj: SubjectType}>();
                 responsibilitiesMap.forEach((resp, key) => {
                    if (key.startsWith(examObj.id + "_")) return; // Don't process for this same exam
                     const [_eId, cId, sId] = key.split("_");
                     if (cId && sId) {
                        const pairKey = `${cId}_${sId}`;
                        if(!existingClassSubjectPairs.has(pairKey) && resp.classObj && resp.subjectObj) {
                           existingClassSubjectPairs.set(pairKey, {classObj: resp.classObj, subjectObj: resp.subjectObj});
                        }
                     }
                 });
                 allClasses.forEach(cls => { // Iterate through classes the teacher is a class teacher for
                    if (cls.classTeacherId === teacherId) {
                        cls.subjects.forEach(sub => {
                             const pairKey = `${cls.id}_${sub.id}`;
                             if(!existingClassSubjectPairs.has(pairKey)) {
                                existingClassSubjectPairs.set(pairKey, {classObj: cls, subjectObj: sub});
                             }
                        });
                    }
                 });
                 specificAssignments.forEach(sa => { // Iterate through specific assignments
                    const cls = allClasses.find(c => c.id === sa.classId);
                    const sub = allSubjectsGlobal.find(s => s.id === sa.subjectId);
                    if (cls && sub) {
                        const pairKey = `${cls.id}_${sub.id}`;
                        if(!existingClassSubjectPairs.has(pairKey)) {
                           existingClassSubjectPairs.set(pairKey, {classObj: cls, subjectObj: sub});
                        }
                    }
                 });


                 existingClassSubjectPairs.forEach(pair => {
                    const key = `${examObj.id}_${pair.classObj.id}_${pair.subjectObj.id}`;
                    responsibilitiesMap.set(key, { classObj: pair.classObj, subjectObj: pair.subjectObj, examObj });
                    console.log(`[getTeacherAssessmentResponsibilities] Added/Overridden via direct exam assignment (T-General - for ${pair.classObj.name} - ${pair.subjectObj.name}): ${key}`);
                 });
            }
        }
    });
    console.log(`[getTeacherAssessmentResponsibilities] Total unique responsibilities for teacher ${teacherId}: ${responsibilitiesMap.size}`);
    return responsibilitiesMap;
}


export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    if (!db) {
      console.error("CRITICAL_ERROR_DB_NULL: Firestore db object is null in getTeacherAssessments.");
      return [];
    }
    if (!teacherId) {
      console.warn("[Teacher Action - getTeacherAssessments] Called without teacherId. Returning empty assessments list.");
      return [];
    }

    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    const assessmentsForForm: Array<{id: string, name: string, maxMarks: number}> = [];

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        assessmentsForForm.push({
            id: key, // examId_classId_subjectId
            name: `${classObj.name} - ${subjectObj.name} - ${examObj.name}`,
            maxMarks: examObj.maxMarks,
        });
    });
    
    assessmentsForForm.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[Teacher Action - getTeacherAssessments] Found ${assessmentsForForm.length} assessments for teacherId: ${teacherId}`);
    return assessmentsForForm;
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
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
    console.error("CRITICAL_ERROR_DB_NULL: Firestore db object is null in getTeacherDashboardData.");
    return {
      ...defaultResponse,
      notifications: [{ id: 'critical_error_db_null', message: "Critical Error: Database connection failed. Dashboard data cannot be loaded.", type: 'warning' }],
    };
  }

  if (!teacherId) {
     console.warn("[Teacher Action - getTeacherDashboardData] Called without teacherId. Returning default dashboard data.");
    return {
      ...defaultResponse,
      notifications: [{ id: 'error_no_teacher_id', message: "Teacher ID not provided. Cannot load dashboard.", type: 'warning' }],
    };
  }
  
  try {
    console.log(`[Teacher Action - getTeacherDashboardData] Fetching data for teacherId: ${teacherId}`);
    const teacherDocument = await getTeacherByIdFromDOS(teacherId); 
    
    if (!teacherDocument) {
      console.warn(`[Teacher Action - getTeacherDashboardData] Teacher record not found for ID: ${teacherId}.`);
      return {
        ...defaultResponse,
        notifications: [{ id: 'error_teacher_not_found', message: `Your teacher record could not be loaded. Please contact administration.`, type: 'warning' }],
        teacherName: undefined, 
      };
    }

    const [generalSettings, allTerms] = await Promise.all([ 
      getGeneralSettings(),
      getTerms(),
    ]);

    const notifications: TeacherNotification[] = [];
    const teacherName = teacherDocument.name; 
    const resourcesText = generalSettings.teacherDashboardResourcesText || defaultResponse.resourcesText;

    const currentTermId = generalSettings.currentTermId;
    const currentTerm = currentTermId ? allTerms.find(t => t.id === currentTermId) : null;
    
    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    const dashboardAssignments: TeacherDashboardAssignment[] = [];
    let earliestOverallDeadline: Date | null = null;
    let earliestOverallDeadlineText: string = "Not set";

    const uniqueClassIds = new Set<string>();
    const uniqueSubjectNames = new Set<string>();

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        uniqueClassIds.add(classObj.id);
        uniqueSubjectNames.add(subjectObj.name);

        let assignmentSpecificDeadlineText = "Not set";
        let assignmentSpecificDeadlineDate: Date | null = null;

        if (examObj.marksSubmissionDeadline) {
            assignmentSpecificDeadlineText = `Exam: ${new Date(examObj.marksSubmissionDeadline).toLocaleDateString()}`;
            assignmentSpecificDeadlineDate = new Date(examObj.marksSubmissionDeadline);
        } else if (generalSettings.globalMarksSubmissionDeadline) {
            assignmentSpecificDeadlineText = `Global: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
            assignmentSpecificDeadlineDate = new Date(generalSettings.globalMarksSubmissionDeadline);
        } else if (currentTerm?.endDate) {
            assignmentSpecificDeadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
            assignmentSpecificDeadlineDate = new Date(currentTerm.endDate);
        }
        
        if (assignmentSpecificDeadlineDate) {
            if (!earliestOverallDeadline || assignmentSpecificDeadlineDate < earliestOverallDeadline) {
                earliestOverallDeadline = assignmentSpecificDeadlineDate;
                earliestOverallDeadlineText = assignmentSpecificDeadlineText; 
            }
        }

        dashboardAssignments.push({
            id: key, 
            className: classObj.name,
            subjectName: subjectObj.name,
            examName: examObj.name,
            nextDeadlineInfo: assignmentSpecificDeadlineText, 
        });
    });
    
    dashboardAssignments.sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className);
      if (classCompare !== 0) return classCompare;
      const subjectCompare = a.subjectName.localeCompare(b.subjectName);
      if (subjectCompare !== 0) return subjectCompare;
      return a.examName.localeCompare(b.examName);
    });

    // Fetch recent submissions count
    let recentSubmissionsCount = 0;
    try {
      const sevenDaysAgo = subDays(new Date(), 7);
      const submissionsQuery = query(
        collection(db, "markSubmissions"),
        where("teacherId", "==", teacherId),
        where("dateSubmitted", ">=", Timestamp.fromDate(sevenDaysAgo))
      );
      const submissionsSnapshot = await getCountFromServer(submissionsQuery);
      recentSubmissionsCount = submissionsSnapshot.data().count;
    } catch (e) {
      console.error("Error fetching recent submissions count:", e);
    }

    const stats: TeacherStats = {
      assignedClassesCount: uniqueClassIds.size,
      subjectsTaughtCount: uniqueSubjectNames.size,
      recentSubmissionsCount: recentSubmissionsCount,
    };


    if (generalSettings.dosGlobalAnnouncementText) {
      notifications.push({
        id: 'dos_announcement',
        message: generalSettings.dosGlobalAnnouncementText,
        type: generalSettings.dosGlobalAnnouncementType || 'info',
      });
    }
    
    if (earliestOverallDeadline) { 
      const today = new Date();
      today.setHours(0,0,0,0); 
      // Clone earliestOverallDeadline to avoid modifying original if it's used elsewhere
      const deadlineForComparison = new Date(earliestOverallDeadline.valueOf());
      deadlineForComparison.setHours(0,0,0,0); 

      const diffTime = deadlineForComparison.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) { 
        const deadlineTypeForMessage = earliestOverallDeadlineText.startsWith("Exam") ? "An exam submission deadline" 
                                     : earliestOverallDeadlineText.startsWith("Global") ? "The global marks submission deadline"
                                     : "The current term submission deadline";
        notifications.push({
          id: 'deadline_reminder',
          message: `${deadlineTypeForMessage} is ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`} (${earliestOverallDeadline.toLocaleDateString()}). Please ensure all marks are submitted.`,
          type: 'deadline',
        });
      }
    }
    
    if (dashboardAssignments.length === 0) {
      let noAssignmentMessage = 'No teaching assignments found for the current term.';
      if (!currentTermId) {
        noAssignmentMessage = 'No current academic term is set by the D.O.S. Assignments cannot be determined.';
      } else if (!(await getAllExamsFromDOS()).filter(e => e.termId === currentTermId).length) { 
         noAssignmentMessage = 'No exams are scheduled for the current academic term. Assignments cannot be determined.';
      }
      notifications.push({
        id: 'no_assignments_info',
        message: noAssignmentMessage,
        type: 'info',
      });
    }
    
    console.log(`[Teacher Action - getTeacherDashboardData] Successfully fetched dashboard data for teacher: ${teacherName} (ID: ${teacherId}). Assignments: ${dashboardAssignments.length}, Notifications: ${notifications.length}. Stats: ${JSON.stringify(stats)}`);
    return { assignments: dashboardAssignments, notifications, teacherName, resourcesText, stats };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while processing dashboard data.";
    console.error(`[Teacher Action - getTeacherDashboardData] ERROR for teacher ${teacherId}:`, error);
    const existingTeacherDoc = await getTeacherByIdFromDOS(teacherId); 
    return {
      ...defaultResponse,
      notifications: [{ id: 'processing_error_dashboard', message: `Error processing dashboard data: ${errorMessage}`, type: 'warning' }],
      teacherName: existingTeacherDoc?.name || undefined, 
    };
  }
}

export async function getTeacherProfileData(teacherId: string): Promise<{ name?: string; email?: string } | null> {
  if (!db) {
    console.error("CRITICAL_ERROR_DB_NULL: Firestore db object is null in getTeacherProfileData.");
    return null;
  }
  if (!teacherId) {
    console.warn("[Teacher Action - getTeacherProfileData] Called without teacherId.");
    return null;
  }
  try {
    const teacher = await getTeacherByIdFromDOS(teacherId); 
    if (teacher) {
      return { name: teacher.name, email: teacher.email };
    }
    return null;
  } catch (error) {
    console.error(`[Teacher Action - getTeacherProfileData] Error fetching profile data for teacher ${teacherId}:`, error);
    return null;
  }
}
    

