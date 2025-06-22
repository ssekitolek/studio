
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation, Exam as ExamTypeFirebase, TeacherStats, MarkSubmissionFirestoreRecord, SubmissionHistoryDisplayItem, ClassInfo, Subject as SubjectType, ClassTeacherData, ClassManagementStudent, GradingScaleItem, ClassAssessment, StudentClassMark, AttendanceData, StudentAttendanceInput, DailyAttendanceRecord, AttendanceHistoryData } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams as getAllExamsFromDOS, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents, getGradingPolicies } from '@/lib/actions/dos-actions';
import type { GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp, doc, getDoc, getCountFromServer, FieldPath, updateDoc, setDoc } from "firebase/firestore";
import { subDays } from "date-fns";


interface MarksSubmissionData {
  assessmentId: string; // Composite ID: examDocId_classDocId_subjectDocId
  marks: Array<{ studentId: string; score: number }>; // studentId is studentIdNumber
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


export async function loginTeacherByEmailPassword(email: string, passwordToVerify: string): Promise<{ success: boolean; message: string; teacher?: { id: string; name: string; email: string; } }> {
  console.log(`[loginTeacherByEmailPassword] Attempting login for email: ${email}`);
  if (!db) {
    console.error("[loginTeacherByEmailPassword] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return { success: false, message: "Authentication service is currently unavailable. Please try again later." };
  }
  try {
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[loginTeacherByEmailPassword] No teacher found with email: ${email}`);
      return { success: false, message: "Invalid email or password." };
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data() as TeacherType;
    console.log(`[loginTeacherByEmailPassword] Teacher document found for email: ${email}, ID: ${teacherDoc.id}, Name: ${teacherData.name}`);


    if (!teacherData.password) {
        console.warn(`[loginTeacherByEmailPassword] Password not set for teacher ID: ${teacherDoc.id}`);
        return { success: false, message: "Password not set for this account. Please contact D.O.S." };
    }
    if (!teacherDoc.id || !teacherData.name || !teacherData.email) {
        console.error(`[loginTeacherByEmailPassword] Teacher account data incomplete for ID: ${teacherDoc.id}. Name: ${teacherData.name}, Email: ${teacherData.email}`);
        return { success: false, message: "Teacher account data is incomplete. Cannot log in." };
    }

    if (teacherData.password === passwordToVerify) {
      console.log(`[loginTeacherByEmailPassword] Login successful for teacher ID: ${teacherDoc.id}`);
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
      console.warn(`[loginTeacherByEmailPassword] Password mismatch for teacher ID: ${teacherDoc.id}`);
      return { success: false, message: "Invalid email or password." };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown internal server error occurred.";
    console.error(`[loginTeacherByEmailPassword] Error during login for email ${email}:`, error);
    return { success: false, message: `Login failed due to a server error: ${errorMessage}. Please try again or contact support if the issue persists.` };
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
  console.log(`[Teacher Action - submitMarks] Valid teacherId: ${teacherId} and composite assessmentId: ${data.assessmentId} received. Proceeding to get assessment details.`);

  const assessmentDetails = await getAssessmentDetails(data.assessmentId);
  console.log(`[Teacher Action - submitMarks] Fetched assessment details (for assessmentName & AI check): ${JSON.stringify(assessmentDetails)}`);
  
  if (assessmentDetails.name.startsWith("Error:")) { 
     console.error(`[Teacher Action - submitMarks] ABORTING_SUBMISSION due to error in getAssessmentDetails: ${assessmentDetails.name}. Marks not saved.`);
     return { success: false, message: `Failed to retrieve assessment details: ${assessmentDetails.name}. Marks not saved.` };
  }

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  
  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName || assessmentDetails.subjectName.startsWith("Unknown") || assessmentDetails.examName.startsWith("Unknown") || assessmentDetails.subjectName.startsWith("Error:") || assessmentDetails.examName.startsWith("Error:")) {
        console.warn(`[Teacher Action - submitMarks] SKIPPING_AI_CHECK for composite assessmentId ${data.assessmentId}: Could not retrieve valid subject or exam names. Subject: "${assessmentDetails.subjectName}", Exam: "${assessmentDetails.examName}".`);
    } else {
        const anomalyInput: GradeAnomalyDetectionInput = {
          subject: assessmentDetails.subjectName,
          exam: assessmentDetails.examName,
          grades: gradeEntries,
          historicalAverage: assessmentDetails.historicalAverage,
        };
        try {
            console.log(`[Teacher Action - submitMarks] Calling gradeAnomalyDetection for composite assessmentId ${data.assessmentId} with input:`, JSON.stringify(anomalyInput));
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log(`[Teacher Action - submitMarks] Anomaly detection result for composite assessmentId ${data.assessmentId}:`, JSON.stringify(anomalyResult));
        } catch (error) {
            console.error(`[Teacher Action - submitMarks] AI_ANOMALY_DETECTION_ERROR for composite assessmentId ${data.assessmentId}:`, error);
            anomalyResult = { hasAnomalies: true, anomalies: [{studentId: "SYSTEM_ERROR", explanation: `Anomaly check failed: ${error instanceof Error ? error.message : String(error)}`}] };
        }
    }
  } else {
     console.log(`[Teacher Action - submitMarks] NO_GRADE_ENTRIES for composite assessmentId ${data.assessmentId}: No actual marks entered to process for anomaly detection.`);
  }

  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;

  const initialTeacherStatus: MarkSubmissionFirestoreRecord['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";
  console.log(`[Teacher Action - submitMarks] Initial teacher-facing status for composite assessmentId ${data.assessmentId} set to: "${initialTeacherStatus}"`);

  const submissionPayload: MarkSubmissionFirestoreRecord = {
    teacherId, 
    assessmentId: data.assessmentId, 
    assessmentName: assessmentDetails.name, 
    dateSubmitted: Timestamp.now(),
    studentCount,
    averageScore,
    status: initialTeacherStatus, 
    submittedMarks: data.marks, 
    anomalyExplanations: anomalyResult?.anomalies || [],
    dosStatus: 'Pending', 
  };
  console.log(`[Teacher Action - submitMarks] PREPARED_SUBMISSION_PAYLOAD_FOR_FIRESTORE (composite assessmentId ${data.assessmentId}):`, JSON.stringify(submissionPayload, null, 2));

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    console.log(`[Teacher Action - submitMarks] ATTEMPTING_FIRESTORE_WRITE for Teacher ID: ${teacherId}, Composite Assessment ID: ${data.assessmentId}, Human-readable Name: ${submissionPayload.assessmentName}.`);
    const docRef = await addDoc(markSubmissionsRef, submissionPayload);
    console.log(`[Teacher Action - submitMarks] FIRESTORE_WRITE_SUCCESS! Document ID: ${docRef.id}. Teacher ID: ${submissionPayload.teacherId}, Composite Assessment ID: ${submissionPayload.assessmentId}, D.O.S Status: ${submissionPayload.dosStatus}`);
  } catch (error) {
    console.error(`[Teacher Action - submitMarks] FIRESTORE_WRITE_FAILED for composite assessmentId ${data.assessmentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving.";
    return { success: false, message: `Failed to save submission to database: ${errorMessage}` };
  }

  const teacherInfo = await getTeacherByIdFromDOS(teacherId);
  const teacherNameParam = teacherInfo?.name ? encodeURIComponent(teacherInfo.name) : "Teacher";

  const teacherPathsToRevalidate = [
    `/teacher/marks/submit?teacherId=${teacherId}&teacherName=${teacherNameParam}`,
    `/teacher/marks/history?teacherId=${teacherId}&teacherName=${teacherNameParam}`,
    `/teacher/dashboard?teacherId=${teacherId}&teacherName=${teacherNameParam}`
  ];
  teacherPathsToRevalidate.forEach(path => revalidatePath(path));
  revalidatePath("/dos/marks-review"); 
  console.log(`[Teacher Action - submitMarks] Revalidation paths triggered for teacher ${teacherId} and D.O.S. after submission for composite assessmentId ${data.assessmentId}.`);


  if (anomalyResult?.hasAnomalies) {
    console.log(`[Teacher Action - submitMarks] END - Submission successful WITH ANOMALIES for teacher ${teacherId}, composite assessmentId ${data.assessmentId}.`);
    return { success: true, message: "Marks submitted. Potential anomalies were detected and have been flagged for D.O.S. review.", anomalies: anomalyResult };
  }
  
  console.log(`[Teacher Action - submitMarks] END - Submission successful WITHOUT ANOMALIES for teacher ${teacherId}, composite assessmentId ${data.assessmentId}.`);
  return { success: true, message: "Marks submitted successfully. No anomalies detected by initial AI check." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number; historicalAverage?: number }> {
    console.log(`[getAssessmentDetails] Called for assessmentId (Composite): "${assessmentId}"`);
    if (!db) {
      console.error("[getAssessmentDetails] CRITICAL_ERROR_DB_NULL: Firestore db object is null. Returning error details.");
      return { subjectName: "Error: DB_NULL", examName: "Error: DB_NULL", name: "Error: DB_NULL: Firestore not initialized", maxMarks: 0 };
    }
    
    if (typeof getDoc !== 'function') {
        console.error("[getAssessmentDetails] CRITICAL_RUNTIME_ERROR: getDoc function IS UNDEFINED at point of use! Firebase SDK might not be loaded correctly or import is missing/corrupted.");
        return { subjectName: "Error: SDK_ERR", examName: "Error: SDK_ERR", name: "Error: SDK_ERR: getDoc is not defined", maxMarks: 0 };
    }

    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.warn(`[getAssessmentDetails] Invalid assessmentId format: ${assessmentId}. Expected examDocId_classDocId_subjectDocId. Returning error details.`);
        return { subjectName: "Error: Invalid ID Format", examName: "Error: Invalid ID Format", name: "Error: Invalid Assessment ID Format", maxMarks: 100 };
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

        let errorMessages: string[] = [];
        if (!exam) {
            console.warn(`[getAssessmentDetails] Exam document not found for ID: ${examId} (from composite ${assessmentId})`);
            errorMessages.push(`Exam (ID ${examId}) not found.`);
        }
        if (!subject) {
            console.warn(`[getAssessmentDetails] Subject document not found for ID: ${subjectId} (from composite ${assessmentId})`);
            errorMessages.push(`Subject (ID ${subjectId}) not found.`);
        }
        if (!cls) {
            console.warn(`[getAssessmentDetails] Class document not found for ID: ${classId} (from composite ${assessmentId})`);
            errorMessages.push(`Class (ID ${classId}) not found.`);
        }

        if (errorMessages.length > 0) {
             const combinedError = `Error: MissingData for composite ${assessmentId}: ${errorMessages.join('; ')}`;
             console.error(`[getAssessmentDetails] ${combinedError}`);
             return { subjectName: "Error: MissingData", examName: "Error: MissingData", name: combinedError, maxMarks: 0 };
        }

        const assessmentName = `${cls?.name || `Unknown Class (${classId})`} - ${subject?.name || `Unknown Subject (${subjectId})`} - ${exam?.name || `Unknown Exam (${examId})`}`;
        const historicalAverage = undefined; 

        const result = {
            subjectName: subject?.name || `Unknown Subject (${subjectId})`, 
            examName: exam?.name || `Unknown Exam (${examId})`,       
            name: assessmentName,
            maxMarks: exam?.maxMarks || 100,
            historicalAverage: historicalAverage,
        };
        console.log(`[getAssessmentDetails] Successfully resolved assessment details for composite ${assessmentId}: ${JSON.stringify(result)}`);
        return result;

    } catch (e) {
        console.error(`[getAssessmentDetails] Firestore error during getDoc operations for composite assessmentId ${assessmentId}:`, e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        return { subjectName: "Error: FirestoreRead", examName: "Error: FirestoreRead", name: `Error: FirestoreRead for composite ${assessmentId}: ${errorMsg}`, maxMarks: 0 };
    }
}

export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  console.log(`[getStudentsForAssessment] Called for assessmentId (Composite): ${assessmentId}`);
  if (!db) {
    console.error("[getStudentsForAssessment] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return [];
  }
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      console.warn(`[getStudentsForAssessment] Invalid assessmentId format: ${assessmentId}. Expected examDocId_classDocId_subjectDocId.`);
      return [];
  }
  const classId = parts[1]; 
  console.log(`[getStudentsForAssessment] Extracted class document ID: ${classId} from assessmentId: ${assessmentId}`);


  const allStudentsData = await getAllStudents(); 
  console.log(`[getStudentsForAssessment] Fetched ${allStudentsData.length} total students.`);
  
  const filteredStudents = allStudentsData.filter(student => student.classId === classId);
  console.log(`[getStudentsForAssessment] Found ${filteredStudents.length} students for class document ID: ${classId}`);
  return filteredStudents;
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
                let displayStatus = data.status; 

                switch(data.dosStatus) {
                    case 'Approved':
                        displayStatus = 'Approved by D.O.S.';
                        break;
                    case 'Rejected':
                        displayStatus = 'Rejected by D.O.S.';
                        break;
                    case 'Pending':
                        if (data.status && data.status.includes('Anomaly')) {
                            displayStatus = 'Pending D.O.S. Review (Anomaly)';
                        } else {
                            displayStatus = 'Pending D.O.S. Review';
                        }
                        break;
                    default: 
                        displayStatus = data.status || 'Status Unknown';
                        console.warn(`[getSubmittedMarksHistory] Doc ID ${docId} has unexpected dosStatus: '${data.dosStatus}'. Falling back to teacher status: '${displayStatus}'`);
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
    getClasses(), getSubjects(), getAllExamsFromDOS(), getGeneralSettings(),
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
    const classObj = allClasses.find(c => c.id === assignment.classId);
    const subjectObj = allSubjects.find(s => s.id === assignment.subjectId);

    if (classObj && subjectObj && Array.isArray(assignment.examIds)) {
        assignment.examIds.forEach(assignedExamId => {
            const examObj = examsForCurrentTerm.find(e => e.id === assignedExamId); 
            
            if (examObj) { 
                const isExamRelevant = 
                    (!examObj.classId || examObj.classId === classObj.id) &&
                    (!examObj.subjectId || examObj.subjectId === subjectObj.id) &&
                    (!examObj.teacherId || examObj.teacherId === teacherId);

                if (isExamRelevant) {
                    const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`; 
                    if (!responsibilitiesMap.has(key)) { 
                        responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
                    }
                }
            }
        });
    }
  });
  
  allClasses.forEach(classObj => {
    if (classObj.classTeacherId === teacherId && Array.isArray(classObj.subjects)) {
      classObj.subjects.forEach(subjectObj => {
        examsForCurrentTerm.forEach(examObj => { 
          const isRelevantForClassTeacher =
            (!examObj.classId || examObj.classId === classObj.id ) &&
            (!examObj.subjectId || examObj.subjectId === subjectObj.id ) &&
            (!examObj.teacherId || examObj.teacherId === teacherId );

          if (isRelevantForClassTeacher) {
            const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`; 
            if (!responsibilitiesMap.has(key)) { 
              responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
            }
          }
        });
      });
    }
  });
  
  examsForCurrentTerm.forEach(examObj => { 
    if (examObj.teacherId === teacherId && examObj.classId && examObj.subjectId) {
      const classForExam = allClasses.find(c => c.id === examObj.classId);
      const subjectForExam = allSubjects.find(s => s.id === examObj.subjectId);

      if (classForExam && subjectForExam) {
        const key = `${examObj.id}_${classForExam.id}_${subjectForExam.id}`; 
        if (!responsibilitiesMap.has(key)) {
          responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: subjectForExam, examObj });
        }
      }
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
    allClasses.forEach(classObj => {
        if (classObj.classTeacherId === teacherId) {
            if (!assignedClassesMap.has(classObj.id)) {
                assignedClassesMap.set(classObj.id, classObj);
            }
            classObj.subjects.forEach(subject => {
                const fullSubject = allSubjects.find(s => s.id === subject.id);
                if (fullSubject && !assignedSubjectsMap.has(fullSubject.id)) {
                    assignedSubjectsMap.set(fullSubject.id, fullSubject);
                }
            });
        }
    });

    // 2. Check for specific subject assignments
    if (Array.isArray(teacherDoc.subjectsAssigned)) {
        teacherDoc.subjectsAssigned.forEach(assignment => {
            const classObj = allClasses.find(c => c.id === assignment.classId);
            const subjectObj = allSubjects.find(s => s.id === assignment.subjectId);
            if (classObj && !assignedClassesMap.has(classObj.id)) {
                assignedClassesMap.set(classObj.id, classObj);
            }
            if (subjectObj && !assignedSubjectsMap.has(subjectObj.id)) {
                assignedSubjectsMap.set(subjectObj.id, subjectObj);
            }
        });
    }

    return { 
        assignedClasses: Array.from(assignedClassesMap.values()),
        assignedSubjects: Array.from(assignedSubjectsMap.values())
    };
}


export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    if (!db) {
      console.error("[getTeacherAssessments] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
      return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
      console.warn(`[getTeacherAssessments] INVALID_TEACHER_ID: Received "${teacherId}". Returning empty array.`);
      return [];
    }

    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    let assessmentsForForm: Array<{id: string, name: string, maxMarks: number}> = [];

    for (const [compositeId, { examObj }] of responsibilitiesMap) {
        const details = await getAssessmentDetails(compositeId); 
        if (!details.name.startsWith("Error:")) {
            assessmentsForForm.push({
                id: compositeId, 
                name: details.name, 
                maxMarks: examObj.maxMarks,
            });
        } else {
            console.warn(`[getTeacherAssessments] Could not get valid details for responsibility composite ID ${compositeId}. Details: ${JSON.stringify(details)}`);
        }
    }
    
    if (assessmentsForForm.length > 0) {
        const generalSettingsResult = await getGeneralSettings();
        const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
        const currentTermId = actualGeneralSettings.currentTermId;

        if (currentTermId) { 
            const markSubmissionsRef = collection(db, "markSubmissions");
            
            const assessmentIdsForCurrentTermResponsibilities = Array.from(responsibilitiesMap.keys());

            if (assessmentIdsForCurrentTermResponsibilities.length > 0) {
                const q = query(
                    markSubmissionsRef,
                    where("teacherId", "==", teacherId),
                    where("assessmentId", "in", assessmentIdsForCurrentTermResponsibilities.length > 0 ? assessmentIdsForCurrentTermResponsibilities : ["_DUMMY_ID_TO_AVOID_EMPTY_IN_QUERY_ERROR_"]) 
                );
                const submissionsSnapshot = await getDocs(q);
                
                const submittedOrFinalizedAssessmentIds = new Set<string>();

                submissionsSnapshot.forEach(docSnap => {
                    const submission = docSnap.data() as MarkSubmissionFirestoreRecord;
                    if (submission.dosStatus === 'Approved' || submission.dosStatus === 'Pending') {
                        submittedOrFinalizedAssessmentIds.add(submission.assessmentId); 
                    }
                });

                assessmentsForForm = assessmentsForForm.filter(assessment => {
                    const shouldKeep = !submittedOrFinalizedAssessmentIds.has(assessment.id);
                    return shouldKeep;
                });
            }
        } else {
            console.warn("[getTeacherAssessments] No current term ID set. Cannot filter by submitted assessments for the current term. All potential assessments will be shown.");
        }
    }

    assessmentsForForm.sort((a, b) => a.name.localeCompare(b.name));
    return assessmentsForForm;
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
      getAllExamsFromDOS() 
    ]);
    const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
    console.log(`[LOG_TDD] General settings loaded. isDefaultTemplate: ${gsIsDefault}, currentTermId: ${actualGeneralSettings.currentTermId}`);

    const notifications: TeacherNotification[] = [];
    const resourcesText = actualGeneralSettings.teacherDashboardResourcesText || defaultResponse.resourcesText;

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

    const assessmentsToSubmit = currentTermId ? await getTeacherAssessments(teacherId) : [];
    
    const dashboardAssignments: TeacherDashboardAssignment[] = assessmentsToSubmit.map(assessment => {
        const parts = assessment.name.split(' - '); 
        const examIdFromKey = assessment.id.split('_')[0]; 
        const examForDeadline = allExamsForDeadlineLookup.find(e => e.id === examIdFromKey && e.termId === currentTermId);
        
        let deadlineText = "Not set";
        if (examForDeadline?.marksSubmissionDeadline) {
             deadlineText = `Exam (${examForDeadline.name}): ${new Date(examForDeadline.marksSubmissionDeadline).toLocaleDateString()}`;
        } else if (actualGeneralSettings.globalMarksSubmissionDeadline) {
             deadlineText = `Global: ${new Date(actualGeneralSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
        } else if (currentTerm?.endDate) {
            deadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
        }

        return {
            id: assessment.id, 
            className: parts[0] || 'N/A',
            subjectName: parts[1] || 'N/A',
            examName: parts[2] || 'N/A',
            nextDeadlineInfo: deadlineText, 
        };
    });

    console.log(`[LOG_TDD] Processed ${dashboardAssignments.length} dashboard assignments (assessments to submit).`);
    
    // This map is still needed for notification logic below.
    const allResponsibilitiesMap = currentTermId ? await getTeacherAssessmentResponsibilities(teacherId) : new Map(); 
    
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
      });
    }

    let earliestOverallDeadline: Date | null = null;
    let earliestOverallDeadlineText: string = "Not set";

    if (dashboardAssignments.length > 0) { 
        dashboardAssignments.forEach(da => {
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

    if (currentTermId && dashboardAssignments.length === 0 && allResponsibilitiesMap.size > 0 && !gsIsDefault) {
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
    return { assignments: dashboardAssignments, notifications, teacherName, resourcesText, stats };

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

  try {
    const teacherRef = doc(db, "teachers", teacherId);
    const teacherSnap = await getDoc(teacherRef);

    if (!teacherSnap.exists()) {
      return { success: false, message: "Teacher account not found." };
    }

    const teacherData = teacherSnap.data() as TeacherType;

    if (!teacherData.password) {
        return { success: false, message: "Current password not set for this account. Cannot change password." };
    }

    if (teacherData.password !== currentPassword) {
      return { success: false, message: "Current password incorrect." };
    }

    await updateDoc(teacherRef, { password: newPassword });
    revalidatePath(`/teacher/profile?teacherId=${encodeURIComponent(teacherId)}`);
    return { success: true, message: "Password changed successfully." };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error changing password for teacher ${teacherId}:`, error);
    return { success: false, message: `Failed to change password: ${errorMessage}` };
  }
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
            allGradingPolicies
        ] = await Promise.all([
            getClasses(),
            getAllStudents(),
            getSubjects(),
            getAllExamsFromDOS(),
            getGeneralSettings(),
            getGradingPolicies()
        ]);

        const teacherClasses = allClasses.filter(c => c.classTeacherId === teacherId);

        if (teacherClasses.length === 0) {
            return [];
        }

        const currentTermId = generalSettings.currentTermId;
        
        const results = await Promise.all(teacherClasses.map(async (classInfo) => {
            const classAssessments: ClassAssessment[] = [];
            const studentsInClass = allStudents
                .filter(s => s.classId === classInfo.id)
                .map(s => ({ id: s.id, studentIdNumber: s.studentIdNumber, firstName: s.firstName, lastName: s.lastName }));

            if(currentTermId){
                const examsForCurrentTerm = allExams.filter(e => e.termId === currentTermId);
                const assessmentIdsToFetch: string[] = [];
                
                classInfo.subjects.forEach(subject => {
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
                
                classInfo.subjects.forEach(subject => {
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

export async function getClassesForTeacher(teacherId: string): Promise<ClassInfo[]> {
    if (!db) return [];
    const allClasses = await getClasses();
    return allClasses.filter(c => c.classTeacherId === teacherId);
}

export async function getStudentsForClass(classId: string): Promise<Student[]> {
  if (!db) return [];
  const q = query(collection(db, "students"), where("classId", "==", classId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
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
            data.records.forEach(record => {
                const student = studentMap.get(record.studentId);
                history.push({
                    date: data.date,
                    studentId: record.studentId,
                    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown Student",
                    status: record.status
                });
            });
        });

        return history;
    } catch (error: any) {
        console.error(`[getAttendanceHistory] Error fetching attendance for class ${classId}:`, error);
        if (error.code === 'failed-precondition') {
            const specificErrorMessage = "The query for attendance history requires a database index. Please create this index in your Firebase Firestore console. The full Firebase error (containing a direct link to create it) should be in your server logs. Index fields: 'classId' (Ascending), 'date' (Descending).";
            console.error("*********************************************************************************");
            console.error("FIRESTORE ERROR (getAttendanceHistory): " + specificErrorMessage);
            console.error("*********************************************************************************");
            throw new Error(specificErrorMessage);
        }
        throw new Error(`Failed to fetch attendance history: ${error.message || "An unknown error occurred."}`);
    }
}
