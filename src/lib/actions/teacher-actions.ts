
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation, Exam as ExamTypeFirebase, TeacherStats, MarkSubmissionFirestoreRecord, SubmissionHistoryDisplayItem } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams as getAllExamsFromDOS, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents } from '@/lib/actions/dos-actions';
import type { ClassInfo, Subject as SubjectType, GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp, doc, getCountFromServer } from "firebase/firestore";
import { subDays } from "date-fns";


interface MarksSubmissionData {
  assessmentId: string; // Composite: examDocId_classDocId_subjectDocId
  marks: Array<{ studentId: string; score: number }>; // studentId is studentIdNumber
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
  console.log(`[Teacher Action - submitMarks] START - Teacher ID: ${teacherId}, Assessment ID from form: ${data.assessmentId}`);
  
  if (!db) {
    console.error("[Teacher Action - submitMarks] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return { success: false, message: "Database service not available. Marks could not be saved." };
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.error(`[Teacher Action - submitMarks] INVALID_TEACHER_ID: Received "${teacherId}"`);
    return { success: false, message: "Teacher ID is invalid or missing. Marks could not be saved." };
  }
  if (!data.assessmentId || !data.marks) {
    console.error("[Teacher Action - submitMarks] INVALID_SUBMISSION_DATA: Assessment ID or marks missing.");
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required. Marks could not be saved." };
  }
  console.log(`[Teacher Action - submitMarks] Valid teacherId: ${teacherId} and assessmentId: ${data.assessmentId} received.`);

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId, // This is studentIdNumber
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  const assessmentDetails = await getAssessmentDetails(data.assessmentId);
  console.log(`[Teacher Action - submitMarks] Fetched assessment details (for assessmentName & AI check): ${JSON.stringify(assessmentDetails)}`);


  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName || assessmentDetails.subjectName.startsWith("Unknown") || assessmentDetails.examName.startsWith("Unknown") || assessmentDetails.subjectName.startsWith("Error:") || assessmentDetails.examName.startsWith("Error:")) {
        console.warn(`[Teacher Action - submitMarks] SKIPPING_AI_CHECK: Could not retrieve valid subject or exam names for assessmentId: ${data.assessmentId}. Subject: "${assessmentDetails.subjectName}", Exam: "${assessmentDetails.examName}".`);
    } else {
        const anomalyInput: GradeAnomalyDetectionInput = {
          subject: assessmentDetails.subjectName,
          exam: assessmentDetails.examName,
          grades: gradeEntries,
          historicalAverage: assessmentDetails.historicalAverage,
        };
        try {
            console.log("[Teacher Action - submitMarks] Calling gradeAnomalyDetection with input:", JSON.stringify(anomalyInput));
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log("[Teacher Action - submitMarks] Anomaly detection result:", JSON.stringify(anomalyResult));
        } catch (error) {
            console.error("[Teacher Action - submitMarks] AI_ANOMALY_DETECTION_ERROR:", error);
            anomalyResult = { hasAnomalies: true, anomalies: [{studentId: "SYSTEM_ERROR", explanation: `Anomaly check failed: ${error instanceof Error ? error.message : String(error)}`}] };
        }
    }
  } else {
     console.log("[Teacher Action - submitMarks] NO_GRADE_ENTRIES: No actual marks entered to process for anomaly detection.");
  }

  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;

  const initialTeacherStatus: MarkSubmissionFirestoreRecord['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";
  console.log(`[Teacher Action - submitMarks] Initial teacher-facing status set to: "${initialTeacherStatus}"`);

  const submissionPayload: MarkSubmissionFirestoreRecord = {
    teacherId, 
    assessmentId: data.assessmentId, // Composite ID: examDocId_classDocId_subjectDocId
    assessmentName: assessmentDetails.name, // Human-readable: Class - Subject - Exam
    dateSubmitted: Timestamp.now(),
    studentCount,
    averageScore,
    status: initialTeacherStatus, 
    submittedMarks: data.marks, // Marks array with studentId (studentIdNumber) and score
    anomalyExplanations: anomalyResult?.anomalies || [],
    dosStatus: 'Pending', // Explicitly setting D.O.S. status
  };
  console.log("[Teacher Action - submitMarks] PREPARED_SUBMISSION_PAYLOAD_FOR_FIRESTORE:", JSON.stringify(submissionPayload));

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    console.log(`[Teacher Action - submitMarks] ATTEMPTING_FIRESTORE_WRITE for Teacher ID: ${teacherId}, Assessment ID (Composite): ${data.assessmentId}, Assessment Name: ${submissionPayload.assessmentName}.`);
    const docRef = await addDoc(markSubmissionsRef, submissionPayload);
    console.log(`[Teacher Action - submitMarks] FIRESTORE_WRITE_SUCCESS! Document ID: ${docRef.id}. Teacher ID: ${submissionPayload.teacherId}, Assessment ID: ${submissionPayload.assessmentId}, Assessment Name: ${submissionPayload.assessmentName}, D.O.S Status: ${submissionPayload.dosStatus}`);
  } catch (error) {
    console.error("[Teacher Action - submitMarks] FIRESTORE_WRITE_FAILED:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving.";
    return { success: false, message: `Failed to save submission: ${errorMessage}` };
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
  console.log(`[Teacher Action - submitMarks] Revalidation paths triggered for teacher ${teacherId} and D.O.S.`);


  if (anomalyResult?.hasAnomalies) {
    console.log(`[Teacher Action - submitMarks] END - Submission successful with anomalies for teacher ${teacherId}.`);
    return { success: true, message: "Marks submitted. Potential anomalies were detected and have been flagged for D.O.S. review.", anomalies: anomalyResult };
  }
  
  console.log(`[Teacher Action - submitMarks] END - Submission successful without anomalies for teacher ${teacherId}.`);
  return { success: true, message: "Marks submitted successfully. No anomalies detected by initial AI check." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number; historicalAverage?: number }> {
    console.log(`[getAssessmentDetails] Called for assessmentId (Composite): ${assessmentId}`);
    if (!db) {
      console.error("[getAssessmentDetails] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
      return { subjectName: "Error: DB Uninitialized", examName: "Error: DB Uninitialized", name: "Error: DB Uninitialized", maxMarks: 100 };
    }
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.warn(`[getAssessmentDetails] Invalid assessmentId format: ${assessmentId}. Expected examDocId_classDocId_subjectDocId.`);
        return { subjectName: "Unknown Subject (Invalid ID Format)", examName: "Unknown Exam (Invalid ID Format)", name: "Unknown Assessment (Invalid ID Format)", maxMarks: 100 };
    }
    const [examId, classId, subjectId] = parts; // These are Firestore document IDs
    console.log(`[getAssessmentDetails] Parsed Document IDs - Exam: ${examId}, Class: ${classId}, Subject: ${subjectId}`);


    const [examDoc, subjectDoc, classDoc] = await Promise.all([
      getDoc(doc(db, "exams", examId)),
      getDoc(doc(db, "subjects", subjectId)),
      getDoc(doc(db, "classes", classId)),
    ]);

    const exam = examDoc.exists() ? { id: examDoc.id, ...examDoc.data() } as ExamTypeFirebase : null;
    const subject = subjectDoc.exists() ? { id: subjectDoc.id, ...subjectDoc.data() } as SubjectType : null;
    const cls = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } as ClassInfo : null; // Basic ClassInfo, subjects array not needed here

    if (!exam) console.warn(`[getAssessmentDetails] Exam document not found for ID: ${examId}`);
    if (!subject) console.warn(`[getAssessmentDetails] Subject document not found for ID: ${subjectId}`);
    if (!cls) console.warn(`[getAssessmentDetails] Class document not found for ID: ${classId}`);


    const assessmentName = `${cls?.name || 'Unknown Class'} - ${subject?.name || 'Unknown Subject'} - ${exam?.name || 'Unknown Exam'}`;
    const historicalAverage = undefined; // Placeholder for future implementation

    const result = {
        subjectName: subject?.name || "Unknown Subject",
        examName: exam?.name || "Unknown Exam",
        name: assessmentName,
        maxMarks: exam?.maxMarks || 100,
        historicalAverage: historicalAverage,
    };
    console.log(`[getAssessmentDetails] Resolved assessment details: ${JSON.stringify(result)}`);
    return result;
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
  const classId = parts[1]; // This is the class Firestore document ID
  console.log(`[getStudentsForAssessment] Extracted class document ID: ${classId} from assessmentId: ${assessmentId}`);


  const allStudentsData = await getAllStudents(); // Fetches all students
  console.log(`[getStudentsForAssessment] Fetched ${allStudentsData.length} total students.`);
  // Filter students whose classId (which is a Firestore doc ID) matches the extracted classId
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
        // Query only by teacherId, order by date. No other filters for a complete history.
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
            console.log(`[getSubmittedMarksHistory] Processing document ID: ${docId}`);
            const rawData = docSnap.data();
            console.log(`[getSubmittedMarksHistory] Raw data for doc ID ${docId}:`, JSON.stringify(rawData));

            try {
                const data = rawData as MarkSubmissionFirestoreRecord;
                let displayStatus = data.status; // Default to teacher's AI check status

                // Override with D.O.S. status if available and more definitive
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
                        // If dosStatus is somehow undefined or unexpected, fallback to the teacher's status
                        displayStatus = data.status || 'Status Unknown';
                }

                if (!(data.dateSubmitted instanceof Timestamp)) {
                    console.warn(`[getSubmittedMarksHistory] Malformed 'dateSubmitted' for doc ID ${docId}. Expected Firestore Timestamp, got ${typeof data.dateSubmitted}. Skipping record.`);
                    return; 
                }
                if (typeof data.assessmentName !== 'string' || !data.assessmentName) {
                     console.warn(`[getSubmittedMarksHistory] Missing or invalid 'assessmentName' for doc ID ${docId}. It should be a string like "Class - Subject - Exam". Skipping record.`);
                     return;
                }


                const item: SubmissionHistoryDisplayItem = {
                    id: docId,
                    assessmentName: data.assessmentName, // Use the stored human-readable name
                    dateSubmitted: data.dateSubmitted.toDate().toISOString(),
                    studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
                    averageScore: typeof data.averageScore === 'number' ? data.averageScore : null,
                    status: displayStatus,
                    dosStatus: data.dosStatus, 
                    dosRejectReason: data.dosRejectReason,
                };
                history.push(item);
                console.log(`[getSubmittedMarksHistory] Successfully mapped doc ID ${docId} to display item.`);
            } catch (mapError) {
                console.error(`[getSubmittedMarksHistory] ERROR transforming document ${docId} to SubmissionHistoryDisplayItem:`, mapError, "Raw Data:", rawData);
            }
        });

        console.log(`[getSubmittedMarksHistory] END - Successfully processed ${history.length} history items for teacherId: ${teacherId}`);
        return history;
    } catch (error) {
        console.error(`[getSubmittedMarksHistory] CRITICAL ERROR fetching history for teacherId ${teacherId}:`, error);
        return []; 
    }
}

async function getTeacherAssessmentResponsibilities(teacherId: string): Promise<Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>> {
  const responsibilitiesMap = new Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>();
  console.log(`[LOG_TAR] ACTION START for teacherId: "${teacherId}"`);

  if (!db) {
    console.error("[LOG_TAR] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return responsibilitiesMap;
  }
   if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.warn(`[LOG_TAR] Invalid teacherId received: "${teacherId}". Returning empty map.`);
    return responsibilitiesMap;
  }

  const teacherDocument = await getTeacherByIdFromDOS(teacherId);
  if (!teacherDocument) {
    console.warn(`[LOG_TAR] Teacher not found for ID: "${teacherId}". Returning empty map.`);
    return responsibilitiesMap;
  }
  console.log(`[LOG_TAR] Fetched teacherDocument: ${teacherDocument.name}, ID: ${teacherDocument.id}, subjectsAssigned: ${JSON.stringify(teacherDocument.subjectsAssigned)}`);

  const [allClasses, allSubjects, allExamsFromSystem, generalSettingsResult] = await Promise.all([
    getClasses(), getSubjects(), getAllExamsFromDOS(), getGeneralSettings(),
  ]);
  console.log(`[LOG_TAR] Fetched allClasses: ${allClasses.length}, allSubjects: ${allSubjects.length}, allExamsFromSystem: ${allExamsFromSystem.length}`);
  const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
  console.log(`[LOG_TAR] General Settings result: isDefaultTemplate=${gsIsDefault}, currentTermId=${actualGeneralSettings.currentTermId}`);

  const currentTermId = actualGeneralSettings.currentTermId;
  if (!currentTermId) {
    console.warn(`[LOG_TAR] No current term ID set in general settings. Cannot determine responsibilities. General settings isDefault: ${gsIsDefault}, currentTermId from actualGeneralSettings: ${actualGeneralSettings.currentTermId}`);
    return responsibilitiesMap;
  }
  console.log(`[LOG_TAR] Current Term ID: ${currentTermId}`);

  const examsForCurrentTerm = allExamsFromSystem.filter(exam => exam.termId === currentTermId);
  if (examsForCurrentTerm.length === 0) {
    console.warn(`[LOG_TAR] No exams found for current term ID: ${currentTermId}. Teacher responsibilities cannot be determined.`);
    return responsibilitiesMap;
  }
  console.log(`[LOG_TAR] Processing ${examsForCurrentTerm.length} exams for current term ID: ${currentTermId}.`);

  const specificAssignments = Array.isArray(teacherDocument.subjectsAssigned) ? teacherDocument.subjectsAssigned : [];
  specificAssignments.forEach(assignment => {
    const classObj = allClasses.find(c => c.id === assignment.classId);
    const subjectObj = allSubjects.find(s => s.id === assignment.subjectId);
    if (classObj && subjectObj && Array.isArray(assignment.examIds)) {
      assignment.examIds.forEach(assignedExamId => {
        const examObj = examsForCurrentTerm.find(e => 
            e.id === assignedExamId && 
            (e.classId === classObj.id || !e.classId || e.classId === null) && 
            (e.subjectId === subjectObj.id || !e.subjectId || e.subjectId === null) &&
            (!e.teacherId || e.teacherId === teacherId || e.teacherId === null) 
        );
        
        if (examObj) {
          const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`; // Composite ID: examDocId_classDocId_subjectDocId
          responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
          console.log(`[LOG_TAR] Added specific responsibility (via subjectsAssigned): ${key} for Exam: ${examObj.name}, Class: ${classObj.name}, Subject: ${subjectObj.name}`);
        } else {
            console.log(`[LOG_TAR] Did NOT add specific responsibility via subjectsAssigned: Exam ID ${assignedExamId} not found or not applicable for Class: ${classObj.name}, Subject: ${subjectObj.name} with current term exams: ${examsForCurrentTerm.map(ex=>ex.id).join(',')}`);
        }
      });
    } else {
        console.log(`[LOG_TAR] Skipped specific assignment: Class or Subject not found, or examIds not an array. Assignment: ${JSON.stringify(assignment)}`);
    }
  });

  allClasses.forEach(classObj => {
    if (classObj.classTeacherId === teacherId && Array.isArray(classObj.subjects)) {
      console.log(`[LOG_TAR] Teacher ${teacherId} is class teacher for ${classObj.name}. Processing subjects: ${classObj.subjects.map(s=>s.name).join(', ')}`);
      classObj.subjects.forEach(subjectObj => {
        examsForCurrentTerm.forEach(examObj => {
          const isRelevantForClassTeacher =
            (!examObj.classId || examObj.classId === classObj.id || examObj.classId === null) &&
            (!examObj.subjectId || examObj.subjectId === subjectObj.id || examObj.subjectId === null) &&
            (!examObj.teacherId || examObj.teacherId === teacherId || examObj.teacherId === null);

          if (isRelevantForClassTeacher) {
            const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`; // Composite ID: examDocId_classDocId_subjectDocId
            if (!responsibilitiesMap.has(key)) { 
              responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
              console.log(`[LOG_TAR] Added responsibility via class teacher role: ${key} for Exam: ${examObj.name}, Class: ${classObj.name}, Subject: ${subjectObj.name}`);
            }
          }
        });
      });
    }
  });

  examsForCurrentTerm.forEach(examObj => {
    if (examObj.teacherId === teacherId && examObj.classId && examObj.subjectId) {
      console.log(`[LOG_TAR] Exam ${examObj.name} (ID: ${examObj.id}) is directly assigned to teacher ${teacherId} with class and subject.`);
      const classForExam = allClasses.find(c => c.id === examObj.classId);
      const subjectForExam = allSubjects.find(s => s.id === examObj.subjectId);

      if (classForExam && subjectForExam) {
        const key = `${examObj.id}_${classForExam.id}_${subjectForExam.id}`; // Composite ID
        if (!responsibilitiesMap.has(key)) {
          responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: subjectForExam, examObj });
          console.log(`[LOG_TAR] Added responsibility via direct exam assignment (class & subject specific): ${key}`);
        }
      } else {
        console.log(`[LOG_TAR] Direct exam assignment for ${examObj.name} to teacher ${teacherId} is missing valid class or subject mapping. Class found: ${!!classForExam}, Subject found: ${!!subjectForExam}`);
      }
    }
  });
  console.log(`[LOG_TAR] END for teacherId: "${teacherId}". Total responsibilities found: ${responsibilitiesMap.size}`);
  return responsibilitiesMap;
}


export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    console.log(`[getTeacherAssessments] START - Called for teacherId: "${teacherId}"`);
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

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        // key is examDocId_classDocId_subjectDocId
        assessmentsForForm.push({
            id: key, 
            name: `${classObj.name} - ${subjectObj.name} - ${examObj.name}`,
            maxMarks: examObj.maxMarks,
        });
    });
    console.log(`[getTeacherAssessments] Initial potential assessments for teacher ${teacherId}: ${assessmentsForForm.length}. IDs: ${assessmentsForForm.map(a=>a.id).join(', ')}`);


    if (assessmentsForForm.length > 0) {
        const generalSettingsResult = await getGeneralSettings();
        const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
        const currentTermId = actualGeneralSettings.currentTermId;

        if (currentTermId) { 
            console.log(`[getTeacherAssessments] Current term ID: ${currentTermId}. Fetching submissions for filtering for teacher ${teacherId}.`);
            const submissionsRef = collection(db, "markSubmissions");
            // Fetch all submissions by this teacher. Term filtering will happen based on exam's termId.
            const q = query(
                submissionsRef,
                where("teacherId", "==", teacherId)
            );
            const submissionsSnapshot = await getDocs(q);
            console.log(`[getTeacherAssessments] Fetched ${submissionsSnapshot.size} total submissions for teacher ${teacherId} to check against current term assessments.`);
            
            const allExamsInSystem = await getAllExamsFromDOS(); 
            
            const submittedOrApprovedOrPendingAssessmentIdsInCurrentTerm = new Set<string>();

            submissionsSnapshot.forEach(docSnap => {
                const submission = docSnap.data() as MarkSubmissionFirestoreRecord;
                const examIdFromSubmission = submission.assessmentId.split('_')[0]; 
                const examDetails = allExamsInSystem.find(e => e.id === examIdFromSubmission);

                if (examDetails && examDetails.termId === currentTermId) {
                    if (submission.dosStatus === 'Approved' || submission.dosStatus === 'Pending') {
                        submittedOrApprovedOrPendingAssessmentIdsInCurrentTerm.add(submission.assessmentId);
                         console.log(`[getTeacherAssessments] Marking assessment ${submission.assessmentId} for filtering (dosStatus: ${submission.dosStatus}, belongs to current term ${currentTermId}).`);
                    } else if (submission.dosStatus === 'Rejected') {
                         console.log(`[getTeacherAssessments] Assessment ${submission.assessmentId} is 'Rejected' (and belongs to current term ${currentTermId}), so it WILL NOT be filtered out from submittable list.`);
                    }
                } else {
                     console.log(`[getTeacherAssessments] Submission for assessmentId ${submission.assessmentId} (Exam ID: ${examIdFromSubmission}) is not for the current term (${currentTermId}, Exam Term: ${examDetails?.termId}). Not using for this filtering pass for submittable assessments.`);
                }
            });

            const originalCount = assessmentsForForm.length;
            assessmentsForForm = assessmentsForForm.filter(assessment => {
                const shouldKeep = !submittedOrApprovedOrPendingAssessmentIdsInCurrentTerm.has(assessment.id);
                if (!shouldKeep) {
                    console.log(`[getTeacherAssessments] Filtering out assessment ${assessment.id} as it's already submitted & (Pending or Approved) in current term.`);
                }
                return shouldKeep;
            });
            console.log(`[getTeacherAssessments] After filtering by D.O.S. status (Approved/Pending in current term) (Removed: ${originalCount - assessmentsForForm.length}, Kept: ${assessmentsForForm.length}) for teacherId ${teacherId}.`);
        } else {
            console.warn("[getTeacherAssessments] No current term ID set. Cannot filter by submitted assessments for the current term. All potential assessments will be shown.");
        }
    }

    assessmentsForForm.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[getTeacherAssessments] END - Found ${assessmentsForForm.length} assessments for teacherId: ${teacherId} to submit marks for.`);
    return assessmentsForForm;
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  console.log(`[LOG_TDD] ACTION START for teacherId: "${teacherId}"`);
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
        const parts = assessment.id.split('_'); 
        const examIdFromKey = parts[0];
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
            className: assessment.name.split(' - ')[0] || 'N/A',
            subjectName: assessment.name.split(' - ')[1] || 'N/A',
            examName: assessment.name.split(' - ')[2] || 'N/A',
            nextDeadlineInfo: deadlineText, 
        };
    });

    console.log(`[LOG_TDD] Processed ${dashboardAssignments.length} dashboard assignments (assessments to submit).`);
    
    const allResponsibilitiesMap = currentTermId ? await getTeacherAssessmentResponsibilities(teacherId) : new Map(); 
    const uniqueClassIds = new Set<string>();
    const uniqueSubjectNames = new Set<string>();
    allResponsibilitiesMap.forEach(({ classObj, subjectObj }) => {
        uniqueClassIds.add(classObj.id);
        uniqueSubjectNames.add(subjectObj.name); 
    });


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
      console.log(`[LOG_TDD] Recent submissions count: ${recentSubmissionsCount}`);
    } catch (e) {
      console.error("[LOG_TDD] Error fetching recent submissions count:", e);
    }

    const stats: TeacherStats = {
      assignedClassesCount: uniqueClassIds.size,
      subjectsTaughtCount: uniqueSubjectNames.size,
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

    if (currentTermId && dashboardAssignments.length === 0 && allResponsibilitiesMap.size > 0) {
       notifications.push({
        id: 'all_marks_submitted_info',
        message: "All marks for your assigned assessments in the current term appear to be submitted and are awaiting D.O.S. review or have been approved. Check 'View Submissions' for details.",
        type: 'info',
      });
      console.log(`[LOG_TDD] Added 'all marks submitted' notification.`);
    } else if (currentTermId && allResponsibilitiesMap.size === 0 && !gsIsDefault) {
        let noAssignmentMessage = 'No teaching assignments found for the current term.';
        const examsForThisTerm = allExamsForDeadlineLookup.filter(e => e.termId === currentTermId);
        if (examsForThisTerm.length === 0) {
            noAssignmentMessage = 'No exams are scheduled for the current academic term. Assignments cannot be determined.';
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
    };
  }
}

export async function getTeacherProfileData(teacherId: string): Promise<{ name?: string; email?: string } | null> {
  console.log(`[getTeacherProfileData] Called for teacherId: "${teacherId}"`);
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
      console.log(`[getTeacherProfileData] Profile data found for teacherId: ${teacherId}`);
      return { name: teacher.name, email: teacher.email };
    }
    console.warn(`[getTeacherProfileData] No profile data found for teacherId: ${teacherId}`);
    return null;
  } catch (error) {
    console.error(`[getTeacherProfileData] Error fetching profile data for teacherId ${teacherId}:`, error);
    return null;
  }
}

