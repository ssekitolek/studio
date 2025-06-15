
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
  marks: Array<{ studentId: string; score: number }>; 
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
  if (!db) {
    return { success: false, message: "Authentication service is currently unavailable. Please try again later." };
  }
  try {
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "Invalid email or password." };
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data() as TeacherType;

    if (!teacherData.password) {
        return { success: false, message: "Password not set for this account. Please contact D.O.S." };
    }
    if (!teacherDoc.id || !teacherData.name || !teacherData.email) {
        return { success: false, message: "Teacher account data is incomplete. Cannot log in." };
    }

    if (teacherData.password === passwordToVerify) {
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
      return { success: false, message: "Invalid email or password." }; 
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown internal server error occurred.";
    return { success: false, message: `Login failed due to a server error: ${errorMessage}. Please try again or contact support if the issue persists.` };
  }
}


export async function submitMarks(teacherId: string, data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log(`[Teacher Action - submitMarks] Called for teacherId: ${teacherId}, assessmentId: ${data.assessmentId}`);
  if (!db) {
    return { success: false, message: "Database service not available. Marks could not be saved." };
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "") {
    return { success: false, message: "Teacher ID is invalid or missing. Marks could not be saved." };
  }
  if (!data.assessmentId || !data.marks) {
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required. Marks could not be saved." };
  }

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  const assessmentDetails = await getAssessmentDetails(data.assessmentId);

  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName || assessmentDetails.subjectName.startsWith("Unknown") || assessmentDetails.examName.startsWith("Unknown")) {
        console.warn("SUBMIT_MARKS_WARNING: Could not retrieve valid subject name or exam name for anomaly detection for assessmentId:", data.assessmentId, `Subject: ${assessmentDetails.subjectName}, Exam: ${assessmentDetails.examName}`);
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

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    await addDoc(markSubmissionsRef, submissionPayload);
  } catch (error) {
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
      return { subjectName: "Error: DB Uninitialized", examName: "Error: DB Uninitialized", name: "Error: DB Uninitialized", maxMarks: 100 };
    }
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        return { subjectName: "Unknown Subject (Invalid ID)", examName: "Unknown Exam (Invalid ID)", name: "Unknown Assessment (Invalid ID)", maxMarks: 100 };
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
    return [];
  }
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      return [];
  }
  const classId = parts[1];

  const allStudents = await getAllStudents(); 
  const filteredStudents = allStudents.filter(student => student.classId === classId);
  return filteredStudents;
}

export async function getSubmittedMarksHistory(teacherId: string): Promise<SubmissionHistoryItem[]> {
    if (!db) {
        return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "") {
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
        return history;
    } catch (error) {
        return [];
    }
}

async function getTeacherAssessmentResponsibilities(teacherId: string): Promise<Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>> {
  const responsibilitiesMap = new Map<string, { classObj: ClassInfo; subjectObj: SubjectType; examObj: ExamTypeFirebase }>();
  console.log(`[LOG_TAR] START for teacherId: "${teacherId}"`);

  if (!db) {
    console.error("[LOG_TAR] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return responsibilitiesMap;
  }
   if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "") {
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
  console.log(`[LOG_TAR] General Settings result: isDefaultTemplate=${generalSettingsResult.isDefaultTemplate}, currentTermId=${generalSettingsResult.currentTermId}`);

  const currentTermId = generalSettingsResult.currentTermId;
  if (!currentTermId) {
    console.warn(`[LOG_TAR] No current term ID set in general settings (isDefaultTemplate: ${generalSettingsResult.isDefaultTemplate}). Cannot determine responsibilities.`);
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
        const examObj = examsForCurrentTerm.find(e => e.id === assignedExamId);
        if (examObj) {
          const key = `${examObj.id}_${classObj.id}_${subjectObj.id}`;
          responsibilitiesMap.set(key, { classObj, subjectObj, examObj });
        }
      });
    }
  });

  allClasses.forEach(classObj => {
    if (classObj.classTeacherId === teacherId && Array.isArray(classObj.subjects)) {
      classObj.subjects.forEach(subjectObj => {
        examsForCurrentTerm.forEach(examObj => {
          const isRelevantForClassTeacher = 
            (!examObj.classId || examObj.classId === classObj.id) &&
            (!examObj.subjectId || examObj.subjectId === subjectObj.id) &&
            (!examObj.teacherId || examObj.teacherId === teacherId);
          
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
    if (examObj.teacherId === teacherId) {
      const classForExam = examObj.classId ? allClasses.find(c => c.id === examObj.classId) : null;
      const subjectForExam = examObj.subjectId ? allSubjects.find(s => s.id === examObj.subjectId) : null;

      if (classForExam && subjectForExam) { 
        const key = `${examObj.id}_${classForExam.id}_${subjectForExam.id}`;
        responsibilitiesMap.set(key, { classObj: classForExam, subjectObj: subjectForExam, examObj }); 
      } else if (classForExam && !subjectForExam) { 
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
            }
         });
      } else if (!classForExam && subjectForExam) { 
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
            }
          });
      } else if (!classForExam && !subjectForExam) { 
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
            }
         });
      }
    }
  });

  return responsibilitiesMap;
}


export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    if (!db) {
      return [];
    }
    if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "") {
      return [];
    }

    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
    const assessmentsForForm: Array<{id: string, name: string, maxMarks: number}> = [];

    responsibilitiesMap.forEach(({ classObj, subjectObj, examObj }, key) => {
        assessmentsForForm.push({
            id: key, 
            name: `${classObj.name} - ${subjectObj.name} - ${examObj.name}`,
            maxMarks: examObj.maxMarks,
        });
    });
    
    assessmentsForForm.sort((a, b) => a.name.localeCompare(b.name));
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
    return {
      ...defaultResponse,
      notifications: [{ id: 'critical_error_db_null', message: "Critical Error: Database connection failed. Dashboard data cannot be loaded.", type: 'warning' }],
    };
  }

  if (!teacherId || teacherId.trim() === "" || teacherId.toLowerCase() === "undefined") { 
    return {
      ...defaultResponse,
      notifications: [{ id: 'error_invalid_teacher_id', message: `Your teacher record could not be loaded. Teacher ID is invalid. (ID used: ${teacherId})`, type: 'warning' }],
    };
  }
  
  try {
    const teacherDocument = await getTeacherByIdFromDOS(teacherId); 
    
    if (!teacherDocument) {
      return {
        ...defaultResponse,
        notifications: [{ id: 'error_teacher_not_found', message: `Your teacher record could not be loaded. Please contact administration. (ID used: ${teacherId})`, type: 'warning' }],
      };
    }
    const teacherName = teacherDocument.name; 

    const [generalSettingsResult, allTerms] = await Promise.all([ 
      getGeneralSettings(),
      getTerms(),
    ]);
    const { isDefaultTemplate: gsIsDefault, ...actualGeneralSettings } = generalSettingsResult;

    const notifications: TeacherNotification[] = [];
    const resourcesText = actualGeneralSettings.teacherDashboardResourcesText || defaultResponse.resourcesText;

    if (gsIsDefault) {
        notifications.push({
            id: 'system_settings_missing_critical',
            message: "Critical System Alert: GradeCentral general settings are not configured by the D.O.S. office. Essential features like term-based assignments cannot be determined. Please contact administration immediately.",
            type: 'warning',
        });
    } else if (!actualGeneralSettings.currentTermId) {
        notifications.push({
            id: 'current_term_not_set_warning',
            message: "System Configuration Alert: The current academic term has not been set by the D.O.S. office. Assignments and deadlines cannot be determined. Please contact administration.",
            type: 'warning', 
        });
    }

    const currentTermId = actualGeneralSettings.currentTermId;
    const currentTerm = currentTermId ? allTerms.find(t => t.id === currentTermId) : null;
    
    const responsibilitiesMap = await getTeacherAssessmentResponsibilities(teacherId);
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
      // Error fetching count, keep as 0
    }

    const stats: TeacherStats = {
      assignedClassesCount: uniqueClassIds.size,
      subjectsTaughtCount: uniqueSubjectNames.size,
      recentSubmissionsCount: recentSubmissionsCount,
    };

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
    }
    
    return { assignments: dashboardAssignments, notifications, teacherName, resourcesText, stats };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while processing dashboard data.";
    let teacherNameOnError: string | undefined = undefined;
    try {
      const existingTeacherDoc = await getTeacherByIdFromDOS(teacherId); 
      teacherNameOnError = existingTeacherDoc?.name;
    } catch (nestedError) {
      //
    }
    return {
      ...defaultResponse,
      notifications: [{ id: 'processing_error_dashboard', message: `Error processing dashboard data for ${teacherNameOnError || `ID ${teacherId}`}: ${errorMessage}.`, type: 'warning' }],
      teacherName: teacherNameOnError, 
    };
  }
}

export async function getTeacherProfileData(teacherId: string): Promise<{ name?: string; email?: string } | null> {
  if (!db) {
    return null;
  }
  if (!teacherId || teacherId.toLowerCase() === "undefined" || teacherId.trim() === "") {
    return null;
  }
  try {
    const teacher = await getTeacherByIdFromDOS(teacherId); 
    if (teacher) {
      return { name: teacher.name, email: teacher.email };
    }
    return null;
  } catch (error) {
    return null;
  }
}

    