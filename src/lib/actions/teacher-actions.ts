
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents } from '@/lib/actions/dos-actions';
import type { ClassInfo, Subject as SubjectType, Exam, GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp, doc } from "firebase/firestore";

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      return { success: false, message: "Invalid email or password. Teacher not found." };
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
      return { success: false, message: "Invalid email or password. Credentials do not match." };
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
      getExams(),
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

// Helper to aggregate unique assessment responsibilities for a teacher
async function getTeacherAssessmentResponsibilities(teacherId: string): Promise<Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: Exam }>> {
    if (!db) {
        console.error("CRITICAL_ERROR_DB_NULL: Firestore db object is null in getTeacherAssessmentResponsibilities.");
        return new Map();
    }

    const teacherDocument = await getTeacherByIdFromDOS(teacherId);
    if (!teacherDocument) {
        console.warn(`[getTeacherAssessmentResponsibilities] Teacher not found for ID: ${teacherId}.`);
        return new Map();
    }

    const [allClasses, generalSettings, allExamsFromDB, allSubjectsGlobal] = await Promise.all([
        getClasses(),
        getGeneralSettings(),
        getExams(),
        getSubjects(),
    ]);

    const currentTermId = generalSettings.currentTermId;
    if (!currentTermId) {
        console.warn("[getTeacherAssessmentResponsibilities] No current term ID set. Cannot determine responsibilities.");
        return new Map();
    }

    const currentTermExams = allExamsFromDB.filter(exam => exam.termId === currentTermId);
    if (currentTermExams.length === 0) {
        console.warn(`[getTeacherAssessmentResponsibilities] No exams found for current term ID: ${currentTermId}.`);
        return new Map();
    }
    
    const responsibilitiesMap = new Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: Exam }>();

    // 1. Process Class Teacher assignments
    allClasses.forEach(classObj => {
        if (classObj.classTeacherId === teacherId && Array.isArray(classObj.subjects)) {
            classObj.subjects.forEach(subjectObj => {
                currentTermExams.forEach(examObj => {
                    // For Class Teacher role, exam must NOT have specific class/subject/teacher assignments
                    // that contradict this broad assignment, or it should be a general exam.
                    // If an exam is highly specific (e.g., specific teacher, class, subject all set on exam doc),
                    // it's handled by direct assignment logic later.
                    if (!examObj.classId && !examObj.subjectId && !examObj.teacherId) { // General exam for the term
                         const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                         if (!responsibilitiesMap.has(key)) {
                            responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        }
                    } else if (examObj.classId === classObj.id && examObj.subjectId === subjectObj.id && !examObj.teacherId) {
                        // Exam specific to this class & subject, but not a specific teacher (so class teacher handles it)
                        const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                         if (!responsibilitiesMap.has(key)) {
                            responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        }
                    }
                });
            });
        }
    });

    // 2. Process Specific Subject Assignments from teacher.subjectsAssigned array
    const specificAssignments = Array.isArray(teacherDocument.subjectsAssigned) ? teacherDocument.subjectsAssigned : [];
    specificAssignments.forEach(assignment => {
        const classObj = allClasses.find(c => c.id === assignment.classId);
        const subjectObj = allSubjectsGlobal.find(s => s.id === assignment.subjectId);

        if (classObj && subjectObj && Array.isArray(assignment.examIds)) {
            assignment.examIds.forEach(assignedExamId => {
                const examObj = currentTermExams.find(e => e.id === assignedExamId);
                if (examObj) {
                    const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                    if (!responsibilitiesMap.has(key)) {
                        responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                    }
                }
            });
        }
    });
    
    // 3. Process Exams directly assigned to this teacher on the Exam document itself
    currentTermExams.forEach(examObj => {
        if (examObj.teacherId === teacherId) {
            if (examObj.classId && examObj.subjectId) {
                // Exam is specifically for this teacher, class, and subject
                const classObj = allClasses.find(c => c.id === examObj.classId);
                const subjectObj = allSubjectsGlobal.find(s => s.id === examObj.subjectId);
                if (classObj && subjectObj) {
                    const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                    responsibilitiesMap.set(key, { classObj, subjectObj, examObj }); // Override if set by other means
                }
            } else if (examObj.classId && !examObj.subjectId) {
                // Exam is for this teacher and a specific class (applies to all subjects they teach in that class)
                const classObj = allClasses.find(c => c.id === examObj.classId);
                if (classObj) {
                    // Find subjects this teacher teaches in this class (either as class teacher or via specific subject assignment)
                    let subjectsInClassForTeacher: SubjectType[] = [];
                    if (classObj.classTeacherId === teacherId) {
                        subjectsInClassForTeacher = classObj.subjects;
                    } else {
                        specificAssignments.forEach(sa => {
                            if (sa.classId === classObj.id) {
                                const sub = allSubjectsGlobal.find(s => s.id === sa.subjectId);
                                if (sub && !subjectsInClassForTeacher.find(s_ => s_.id === sub.id)) subjectsInClassForTeacher.push(sub);
                            }
                        });
                    }
                    subjectsInClassForTeacher.forEach(subjectObj => {
                        const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                        responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                    });
                }
            } else if (!examObj.classId && examObj.subjectId) {
                // Exam is for this teacher and a specific subject (applies to all classes where they teach this subject)
                // This is a bit more complex - find all classes where this teacher teaches this subject
                 allClasses.forEach(classObj => {
                    const teachesThisSubjectInThisClass = 
                        (classObj.classTeacherId === teacherId && classObj.subjects.some(s => s.id === examObj.subjectId)) ||
                        specificAssignments.some(sa => sa.classId === classObj.id && sa.subjectId === examObj.subjectId);
                    
                    if(teachesThisSubjectInThisClass) {
                        const subjectObj = allSubjectsGlobal.find(s => s.id === examObj.subjectId);
                        if (subjectObj) {
                            const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                            responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                        }
                    }
                 });

            } else {
                // Exam is assigned to this teacher generally (applies to all subjects in all classes they teach)
                // Iterate through responsibilities already established by Class Teacher or specific subject assignments
                const existingClassSubjectPairs = new Set<string>();
                responsibilitiesMap.forEach((val, key) => {
                     const [_eId, cId, sId] = key.split('_');
                     existingClassSubjectPairs.add(`${cId}_${sId}`);
                });

                existingClassSubjectPairs.forEach(csPair => {
                    const [cId, sId] = csPair.split('_');
                    const classObj = allClasses.find(c => c.id === cId);
                    const subjectObj = allSubjectsGlobal.find(s => s.id === sId);
                    if (classObj && subjectObj) {
                         const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
                         responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                    }
                });
            }
        }
    });


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
  const defaultResponse: TeacherDashboardData = {
    assignments: [],
    notifications: [],
    teacherName: undefined,
    resourcesText: "Default resources text: Please refer to the school guidelines for teaching materials and policies."
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
    
    let deadlineText = "Not set"; // Default
    let deadlineDateForComparison: Date | null = null;

    // Determine the most relevant deadline for display and comparison
    if (currentTerm) { // Only proceed if there's a current term
        const examsForCurrentTerm = (await getExams()).filter(e => e.termId === currentTerm.id);
        
        // Find if any exam specifically assigned to this teacher (via any method) has its own deadline
        const responsibilities = await getTeacherAssessmentResponsibilities(teacherId);
        let specificExamDeadline: string | undefined;
        responsibilities.forEach(resp => {
            if (resp.examObj.marksSubmissionDeadline) {
                if (!specificExamDeadline || new Date(resp.examObj.marksSubmissionDeadline) < new Date(specificExamDeadline)) {
                    specificExamDeadline = resp.examObj.marksSubmissionDeadline;
                }
            }
        });

        if (specificExamDeadline) {
            deadlineText = `Specific Exam: ${new Date(specificExamDeadline).toLocaleDateString()}`;
            deadlineDateForComparison = new Date(specificExamDeadline);
        } else if (generalSettings.globalMarksSubmissionDeadline) {
            deadlineText = `Global: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
            deadlineDateForComparison = new Date(generalSettings.globalMarksSubmissionDeadline);
        } else if (currentTerm.endDate) {
            deadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
            deadlineDateForComparison = new Date(currentTerm.endDate);
        }
    }


    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    const dashboardAssignments: TeacherDashboardAssignment[] = [];

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        // Use the most specific deadline available for this assignment
        let assignmentDeadlineText = deadlineText; // Default to general/term deadline
        if (examObj.marksSubmissionDeadline) {
            assignmentDeadlineText = `Exam Deadline: ${new Date(examObj.marksSubmissionDeadline).toLocaleDateString()}`;
        }

        dashboardAssignments.push({
            id: key, // examId_classId_subjectId
            className: classObj.name,
            subjectName: subjectObj.name,
            examName: examObj.name,
            nextDeadlineInfo: assignmentDeadlineText, 
        });
    });
    
    dashboardAssignments.sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className);
      if (classCompare !== 0) return classCompare;
      const subjectCompare = a.subjectName.localeCompare(b.subjectName);
      if (subjectCompare !== 0) return subjectCompare;
      return a.examName.localeCompare(b.examName);
    });

    if (generalSettings.dosGlobalAnnouncementText) {
      notifications.push({
        id: 'dos_announcement',
        message: generalSettings.dosGlobalAnnouncementText,
        type: generalSettings.dosGlobalAnnouncementType || 'info',
      });
    }
    
    if (deadlineDateForComparison) { // Use the determined overall deadline for notification
      const today = new Date();
      today.setHours(0,0,0,0); 
      deadlineDateForComparison.setHours(0,0,0,0); 

      const diffTime = deadlineDateForComparison.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) { 
        const deadlineTypeForMessage = deadlineText.startsWith("Specific Exam") ? "A specific exam submission deadline" 
                                     : deadlineText.startsWith("Global") ? "The global marks submission deadline"
                                     : "The current term submission deadline";
        notifications.push({
          id: 'deadline_reminder',
          message: `${deadlineTypeForMessage} is ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`} (${deadlineDateForComparison.toLocaleDateString()}). Please ensure all marks are submitted.`,
          type: 'deadline',
        });
      }
    }
    
    if (dashboardAssignments.length === 0) {
      let noAssignmentMessage = 'No teaching assignments found for the current term.';
      if (!currentTermId) {
        noAssignmentMessage = 'No current academic term is set by the D.O.S. Assignments cannot be determined.';
      } else if (!(await getExams()).filter(e => e.termId === currentTermId).length) { 
         noAssignmentMessage = 'No exams are scheduled for the current academic term. Assignments cannot be determined.';
      }
      notifications.push({
        id: 'no_assignments_info',
        message: noAssignmentMessage,
        type: 'info',
      });
    }
    
    console.log(`[Teacher Action - getTeacherDashboardData] Successfully fetched dashboard data for teacher: ${teacherName} (ID: ${teacherId}). Assignments: ${dashboardAssignments.length}, Notifications: ${notifications.length}.`);
    return { assignments: dashboardAssignments, notifications, teacherName, resourcesText };

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
    

