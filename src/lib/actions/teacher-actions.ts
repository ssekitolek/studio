
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
  assessmentId: string;
  marks: Array<{ studentId: string; score: number }>;
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
  console.log(`[Teacher Action - submitMarks] Called for teacherId: ${teacherId}, assessmentId: ${data.assessmentId}`);
  if (!db) {
    console.error("[Teacher Action - submitMarks] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return { success: false, message: "Database service not available. Marks could not be saved." };
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
    console.error(`[Teacher Action - submitMarks] Invalid teacherId received: "${teacherId}"`);
    return { success: false, message: "Teacher ID is invalid or missing. Marks could not be saved." };
  }
  if (!data.assessmentId || !data.marks) {
    console.error("[Teacher Action - submitMarks] Invalid submission data. Assessment ID or marks missing.");
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required. Marks could not be saved." };
  }

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  const assessmentDetails = await getAssessmentDetails(data.assessmentId);
  console.log(`[Teacher Action - submitMarks] Assessment details: ${JSON.stringify(assessmentDetails)}`);


  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName || assessmentDetails.subjectName.startsWith("Unknown") || assessmentDetails.examName.startsWith("Unknown") || assessmentDetails.subjectName.startsWith("Error:") || assessmentDetails.examName.startsWith("Error:")) {
        console.warn("[Teacher Action - submitMarks] Could not retrieve valid subject name or exam name for anomaly detection for assessmentId:", data.assessmentId, `Subject: ${assessmentDetails.subjectName}, Exam: ${assessmentDetails.examName}. Skipping AI anomaly check.`);

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
            console.error("[Teacher Action - submitMarks] Error during anomaly detection:", error);
            anomalyResult = { hasAnomalies: true, anomalies: [{studentId: "SYSTEM_ERROR", explanation: `Anomaly check failed: ${error instanceof Error ? error.message : String(error)}`}] };
        }
    }
  } else {
     console.log("[Teacher Action - submitMarks] No grade entries to process for anomaly detection.");
  }

  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;

  const initialTeacherStatus: MarkSubmissionFirestoreRecord['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";
  console.log(`[Teacher Action - submitMarks] Setting initial teacher-facing status for submission: ${initialTeacherStatus}`);

  const submissionPayload: Omit<MarkSubmissionFirestoreRecord, 'dosLastReviewedBy' | 'dosLastReviewedAt' | 'dosEdited' | 'dosLastEditedAt' | 'dosRejectReason'> = {
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
  console.log("[Teacher Action - submitMarks] Submission payload prepared:", JSON.stringify(submissionPayload));


  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    const docRef = await addDoc(markSubmissionsRef, submissionPayload);
    console.log(`[Teacher Action - submitMarks] Marks successfully saved to Firestore. Document ID: ${docRef.id}, Status: ${initialTeacherStatus}, DOS Status: Pending`);
  } catch (error) {
    console.error("[Teacher Action - submitMarks] Error saving submission to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving.";
    return { success: false, message: `Failed to save submission: ${errorMessage}` };
  }

  const teacherInfo = await getTeacherByIdFromDOS(teacherId);
  const teacherNameParam = teacherInfo?.name ? encodeURIComponent(teacherInfo.name) : "Teacher";

  revalidatePath(`/teacher/marks/submit?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
  revalidatePath(`/teacher/marks/history?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
  revalidatePath(`/teacher/dashboard?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
  revalidatePath("/dos/marks-review"); // D.O.S. portal also needs revalidation

  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and have been flagged for D.O.S. review.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected by initial AI check." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number; historicalAverage?: number }> {
    console.log(`[getAssessmentDetails] Called for assessmentId: ${assessmentId}`);
    if (!db) {
      console.error("[getAssessmentDetails] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
      return { subjectName: "Error: DB Uninitialized", examName: "Error: DB Uninitialized", name: "Error: DB Uninitialized", maxMarks: 100 };
    }
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.warn(`[getAssessmentDetails] Invalid assessmentId format: ${assessmentId}`);
        return { subjectName: "Unknown Subject (Invalid ID)", examName: "Unknown Exam (Invalid ID)", name: "Unknown Assessment (Invalid ID)", maxMarks: 100 };
    }
    const [examId, classId, subjectId] = parts;
    console.log(`[getAssessmentDetails] Parsed IDs - Exam: ${examId}, Class: ${classId}, Subject: ${subjectId}`);


    const [allExams, allSubjects, allClasses] = await Promise.all([
      getAllExamsFromDOS(),
      getSubjects(),
      getClasses()
    ]);
    console.log(`[getAssessmentDetails] Fetched ${allExams.length} exams, ${allSubjects.length} subjects, ${allClasses.length} classes.`);


    const exam = allExams.find(e => e.id === examId);
    const subject = allSubjects.find(s => s.id === subjectId);
    const cls = allClasses.find(c => c.id === classId);

    if (!exam) console.warn(`[getAssessmentDetails] Exam not found for ID: ${examId}`);
    if (!subject) console.warn(`[getAssessmentDetails] Subject not found for ID: ${subjectId}`);
    if (!cls) console.warn(`[getAssessmentDetails] Class not found for ID: ${classId}`);


    const assessmentName = `${cls?.name || 'Unknown Class'} - ${subject?.name || 'Unknown Subject'} - ${exam?.name || 'Unknown Exam'}`;
    const historicalAverage = undefined; // Placeholder, not implemented

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
  console.log(`[getStudentsForAssessment] Called for assessmentId: ${assessmentId}`);
  if (!db) {
    console.error("[getStudentsForAssessment] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return [];
  }
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      console.warn(`[getStudentsForAssessment] Invalid assessmentId format: ${assessmentId}`);
      return [];
  }
  const classId = parts[1];
  console.log(`[getStudentsForAssessment] Extracted classId: ${classId}`);


  const allStudentsData = await getAllStudents();
  console.log(`[getStudentsForAssessment] Fetched ${allStudentsData.length} total students.`);
  const filteredStudents = allStudentsData.filter(student => student.classId === classId);
  console.log(`[getStudentsForAssessment] Found ${filteredStudents.length} students for classId: ${classId} from assessmentId: ${assessmentId}`);
  return filteredStudents;
}

export async function getSubmittedMarksHistory(teacherId: string): Promise<SubmissionHistoryDisplayItem[]> {
    console.log(`[getSubmittedMarksHistory] Called for teacherId: "${teacherId}"`);
    if (!db) {
        console.error("[getSubmittedMarksHistory] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
        return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
        console.warn(`[getSubmittedMarksHistory] Invalid teacherId received: "${teacherId}". Returning empty array.`);
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
            console.log(`[getSubmittedMarksHistory] No submission history found for teacherId: ${teacherId}`);
            return [];
        }

        const history: SubmissionHistoryDisplayItem[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data() as MarkSubmissionFirestoreRecord;
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
                    // If dosStatus is undefined, use the original teacher status
                    displayStatus = data.status || 'Unknown Status';
            }

            return {
                id: docSnap.id,
                assessmentName: data.assessmentName || "N/A",
                dateSubmitted: data.dateSubmitted instanceof Timestamp ? data.dateSubmitted.toDate().toISOString() : new Date().toISOString(),
                studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
                averageScore: typeof data.averageScore === 'number' ? data.averageScore : null,
                status: displayStatus, // This is the derived status for teacher display
                dosStatus: data.dosStatus, // Keep the raw D.O.S. status too
                dosRejectReason: data.dosRejectReason,
            };
        });
        console.log(`[getSubmittedMarksHistory] Fetched ${history.length} history items for teacherId: ${teacherId}`);
        return history;
    } catch (error) {
        console.error(`[getSubmittedMarksHistory] Error fetching history for teacherId ${teacherId}:`, error);
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
        const examObj = examsForCurrentTerm.find(e => e.id === assignedExamId && e.classId === classObj.id && e.subjectId === subjectObj.id);
        if (examObj) {
          const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
          responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
          console.log(`[LOG_TAR] Added specific responsibility via subjectsAssigned: ${key} for Exam: ${examObj.name}, Class: ${classObj.name}, Subject: ${subjectObj.name}`);
        } else {
           const generalExamObj = examsForCurrentTerm.find(e => e.id === assignedExamId && !e.classId && !e.subjectId && !e.teacherId);
           if (generalExamObj) {
             const key = `${generalExamObj.id}_${classObj.id}_${subjectObj.id}`;
             responsibilitiesMap.set(key, { classObj, subjectObj, examObj: generalExamObj });
             console.log(`[LOG_TAR] Added specific responsibility via subjectsAssigned (General Exam): ${key} for Exam: ${generalExamObj.name}, Class: ${classObj.name}, Subject: ${subjectObj.name}`);
           } else {
            console.log(`[LOG_TAR] Did NOT add specific responsibility via subjectsAssigned: Exam ID ${assignedExamId} (from teacher doc) not found in examsForCurrentTerm OR class/subject on exam didn't match for Class: ${classObj.name}, Subject: ${subjectObj.name}`);
           }
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
            (!examObj.classId || examObj.classId === classObj.id) &&
            (!examObj.subjectId || examObj.subjectId === subjectObj.id) &&
            (!examObj.teacherId || examObj.teacherId === teacherId || examObj.teacherId === null);

          if (isRelevantForClassTeacher) {
            const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
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
    if (examObj.teacherId === teacherId) {
      console.log(`[LOG_TAR] Exam ${examObj.name} (ID: ${examObj.id}) is directly assigned to teacher ${teacherId}.`);
      const classForExam = examObj.classId ? allClasses.find(c => c.id === examObj.classId) : null;
      const subjectForExam = examObj.subjectId ? allSubjects.find(s => s.id === examObj.subjectId) : null;

      if (classForExam && subjectForExam) {
        const key = `${examObj.id}_${classForExam.id}_${subjectForExam.id}`;
        responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: subjectForExam, examObj });
        console.log(`[LOG_TAR] Added responsibility via direct exam assignment (class & subject specific): ${key}`);
      } else if (classForExam && !subjectForExam) {
         console.log(`[LOG_TAR] Direct exam assignment for ${examObj.name} is class-specific (${classForExam.name}), iterating subjects for this class.`);
         const subjectsInThisClassTeacherIsResponsibleFor = new Set<string>();
         if(classForExam.classTeacherId === teacherId) {
            classForExam.subjects.forEach(s => subjectsInThisClassTeacherIsResponsibleFor.add(s.id));
         }
         specificAssignments.forEach(sa => {
            if (sa.classId === classForExam.id && Array.isArray(sa.examIds) && sa.examIds.includes(examObj.id)) {
                 subjectsInThisClassTeacherIsResponsibleFor.add(sa.subjectId);
            }
         });
         subjectsInThisClassTeacherIsResponsibleFor.forEach(subId => {
            const actualSubjectObj = allSubjects.find(s => s.id === subId);
            if (actualSubjectObj) {
                const key = `${examObj.id}_${classForExam.id}_${actualSubjectObj.id}`;
                responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: actualSubjectObj, examObj });
                console.log(`[LOG_TAR] Added responsibility via direct exam assignment (class specific, subject derived): ${key}`);
            }
         });
      } else if (!classForExam && subjectForExam) {
          console.log(`[LOG_TAR] Direct exam assignment for ${examObj.name} is subject-specific (${subjectForExam.name}), iterating classes for this subject.`);
          allClasses.forEach(c => {
            let teacherTeachesThisSubjectInThisClass = false;
            if (c.classTeacherId === teacherId && c.subjects.some(s => s.id === subjectForExam.id)) {
                teacherTeachesThisSubjectInThisClass = true;
            } else {
                if (specificAssignments.some(sa => sa.classId === c.id && sa.subjectId === subjectForExam.id && Array.isArray(sa.examIds) && sa.examIds.includes(examObj.id))) {
                    teacherTeachesThisSubjectInThisClass = true;
                }
            }
            if (teacherTeachesThisSubjectInThisClass) {
                const key = `${examObj.id}_${c.id}_${subjectForExam.id}`;
                responsibilitiesMap.set(key, { classObj: c, subjectObj: subjectForExam, examObj });
                console.log(`[LOG_TAR] Added responsibility via direct exam assignment (subject specific, class derived): ${key}`);
            }
          });
      } else if (!classForExam && !subjectForExam) {
         console.log(`[LOG_TAR] Direct exam assignment for ${examObj.name} is general. Determining applicable classes/subjects.`);
         const applicableClassSubjectPairs = new Set<string>();
         allClasses.forEach(cls => {
            if (cls.classTeacherId === teacherId) {
                cls.subjects.forEach(sub => applicableClassSubjectPairs.add(`${cls.id}_${sub.id}`));
            }
         });
         specificAssignments.forEach(sa => {
            if (Array.isArray(sa.examIds) && sa.examIds.includes(examObj.id)) {
                applicableClassSubjectPairs.add(`${sa.classId}_${sa.subjectId}`);
            }
         });
         applicableClassSubjectPairs.forEach(pairKey => {
            const [cId, sId] = pairKey.split("_");
            const cObj = allClasses.find(c => c.id === cId);
            const sObj = allSubjects.find(s => s.id === sId);
            if (cObj && sObj) {
                const key = `${examObj.id}_${cObj.id}_${sObj.id}`;
                responsibilitiesMap.set(key, { classObj: cObj, subjectObj: sObj, examObj });
                console.log(`[LOG_TAR] Added responsibility via direct exam assignment (general exam, class/subject derived): ${key}`);
            }
         });
      }
    }
  });
  console.log(`[LOG_TAR] END for teacherId: "${teacherId}". Total responsibilities found: ${responsibilitiesMap.size}`);
  return responsibilitiesMap;
}


export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    console.log(`[getTeacherAssessments] Called for teacherId: "${teacherId}"`);
    if (!db) {
      console.error("[getTeacherAssessments] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
      return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "" || teacherId === "undefined") {
      console.warn(`[getTeacherAssessments] Invalid teacherId received: "${teacherId}". Returning empty array.`);
      return [];
    }

    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    let assessmentsForForm: Array<{id: string, name: string, maxMarks: number}> = [];

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        assessmentsForForm.push({
            id: key, 
            name: `${classObj.name} - ${subjectObj.name} - ${examObj.name}`,
            maxMarks: examObj.maxMarks,
        });
    });

    if (assessmentsForForm.length > 0) {
        const generalSettingsResult = await getGeneralSettings();
        const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;
        const currentTermId = actualGeneralSettings.currentTermId;

        if (currentTermId) { 
            const submissionsRef = collection(db, "markSubmissions");
            const q = query(
                submissionsRef,
                where("teacherId", "==", teacherId)
            );
            const submissionsSnapshot = await getDocs(q);
            const nonRejectedSubmittedAssessmentIdsForCurrentTerm = new Set<string>();
            const allExams = await getAllExamsFromDOS(); 

            submissionsSnapshot.forEach(docSnap => {
                const submission = docSnap.data() as MarkSubmissionFirestoreRecord;
                const examIdFromSubmission = submission.assessmentId.split('_')[0];
                const examIsCurrentTerm = allExams.some(e => e.id === examIdFromSubmission && e.termId === currentTermId);

                if (examIsCurrentTerm && (submission.dosStatus === 'Approved' || submission.dosStatus === 'Pending')) {
                    nonRejectedSubmittedAssessmentIdsForCurrentTerm.add(submission.assessmentId);
                }
            });

            assessmentsForForm = assessmentsForForm.filter(assessment => !nonRejectedSubmittedAssessmentIdsForCurrentTerm.has(assessment.id));
            console.log(`[getTeacherAssessments] After filtering submitted (Pending/Approved for current term) assessments, ${assessmentsForForm.length} remain.`);
        } else {
            console.warn("[getTeacherAssessments] No current term ID set, cannot filter by submitted assessments for the current term. All potential assessments will be shown.");
        }
    }

    assessmentsForForm.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[getTeacherAssessments] Found ${assessmentsForForm.length} assessments for teacherId: ${teacherId}.`);
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

    const [generalSettingsResult, allTerms] = await Promise.all([
      getGeneralSettings(),
      getTerms(),
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

    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    console.log(`[LOG_TDD] Teacher assessment responsibilities map size: ${responsibilitiesMap.size}`);
    const dashboardAssignments: TeacherDashboardAssignment[] = [];
    let earliestOverallDeadline: Date | null = null;
    let earliestOverallDeadlineText: string = "Not set";

    const uniqueClassIds = new Set<string>();
    const uniqueSubjectNames = new Set<string>();

    if (currentTermId) {
        responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
            uniqueClassIds.add(classObj.id);
            uniqueSubjectNames.add(subjectObj.name);

            let assignmentSpecificDeadlineText = "Not set";
            let assignmentSpecificDeadlineDate: Date | null = null;

            if (examObj.marksSubmissionDeadline) {
                assignmentSpecificDeadlineText = `Exam: ${new Date(examObj.marksSubmissionDeadline).toLocaleDateString()}`;
                assignmentSpecificDeadlineDate = new Date(examObj.marksSubmissionDeadline);
            } else if (actualGeneralSettings.globalMarksSubmissionDeadline) {
                assignmentSpecificDeadlineText = `Global: ${new Date(actualGeneralSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
                assignmentSpecificDeadlineDate = new Date(actualGeneralSettings.globalMarksSubmissionDeadline);
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
    }

    dashboardAssignments.sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className);
      if (classCompare !== 0) return classCompare;
      const subjectCompare = a.subjectName.localeCompare(b.subjectName);
      if (subjectCompare !== 0) return subjectCompare;
      return a.examName.localeCompare(b.examName);
    });
    console.log(`[LOG_TDD] Processed ${dashboardAssignments.length} dashboard assignments.`);

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
        notifications.push({
          id: 'deadline_reminder',
          message: `${deadlineTypeForMessage} is ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`} (${earliestOverallDeadline.toLocaleDateString()}). Please ensure all marks are submitted.`,
          type: 'deadline',
        });
        console.log(`[LOG_TDD] Added deadline reminder: ${deadlineTypeForMessage}`);
      }
    }

    if (currentTermId && dashboardAssignments.length === 0 && responsibilitiesMap.size === 0) {
      let noAssignmentMessage = 'No teaching assignments found for the current term.';
      const examsForCurrentTerm = (await getAllExamsFromDOS()).filter(e => e.termId === currentTermId);
      if (examsForCurrentTerm.length === 0) {
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
