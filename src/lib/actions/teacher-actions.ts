
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
  if (!db) {
    console.error("CRITICAL: Firestore database (db) is not initialized in loginTeacherByEmailPassword. Check Firebase configuration.");
    return { success: false, message: "Authentication service is currently unavailable. Please try again later." };
  }

  try {
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "Invalid email or password. Teacher not found." };
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data() as TeacherType;
    
    if (!teacherData.password) {
        console.error(`Teacher with email ${email} (ID: ${teacherDoc.id}) does not have a password set.`);
        return { success: false, message: "Password not set for this account. Please contact D.O.S." };
    }

    // Directly compare plain text passwords (NOT FOR PRODUCTION)
    if (teacherData.password === passwordToVerify) {
      // Verify essential teacher data is present for login to proceed
      if (!teacherDoc.id || !teacherData.name || !teacherData.email) {
          console.error("Teacher document is missing id, name, or email for login.", {id: teacherDoc.id, name: teacherData.name, email: teacherData.email});
          return { success: false, message: "Teacher account data is incomplete. Cannot log in." };
      }
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
      return { success: false, message: "Invalid email or password. Credentials do not match." };
    }
  } catch (error) {
    console.error("Error during teacher login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during login.";
    return { success: false, message: `Login failed: ${errorMessage}` };
  }
}


export async function submitMarks(teacherId: string, data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  if (!db) {
    return { success: false, message: "Database service not available." };
  }
  if (!teacherId) {
    return { success: false, message: "Teacher ID is missing." };
  }
  if (!data.assessmentId || !data.marks) {
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required." };
  }

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;
  const assessmentDetails = await getAssessmentDetails(data.assessmentId);

  if (gradeEntries.length > 0) {
    if (!assessmentDetails.subjectName || !assessmentDetails.examName) {
        console.error("Could not retrieve subject name or exam name for anomaly detection for assessmentId:", data.assessmentId);
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
            console.error("Error during anomaly detection:", error);
            anomalyResult = { hasAnomalies: true, anomalies: [{studentId: "SYSTEM_ERROR", explanation: `Anomaly check failed: ${error instanceof Error ? error.message : String(error)}`}] };
        }
    }
  }
  
  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;
  
  const initialStatus: SubmissionHistoryItem['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    await addDoc(markSubmissionsRef, {
      teacherId,
      assessmentId: data.assessmentId,
      assessmentName: assessmentDetails.name, 
      dateSubmitted: Timestamp.now(), 
      studentCount,
      averageScore,
      status: initialStatus,
      submittedMarks: data.marks,
      anomalyExplanations: anomalyResult?.anomalies || [],
    });
  } catch (error) {
    console.error("Error saving mark submission to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to save submission: ${errorMessage}` };
  }

  revalidatePath(`/teacher/marks/submit?teacherId=${teacherId}`); 
  revalidatePath(`/teacher/marks/history?teacherId=${teacherId}`); 
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number; historicalAverage?: number }> {
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
        console.error("Firestore is not initialized.");
        return [];
    }
    if (!teacherId) {
        console.warn("Teacher ID not provided for fetching submission history.");
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
        console.error("Error fetching submission history:", error);
        return [];
    }
}

export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    const teacher = await getTeacherByIdFromDOS(teacherId); 
    if (!teacher) {
        console.warn(`Teacher not found for ID: ${teacherId}`);
        return [];
    }

    const [allExams, allClasses, generalSettings, allSubjectsGlobal] = await Promise.all([
        getExams(),
        getClasses(), 
        getGeneralSettings(),
        getSubjects()
    ]);

    const currentTermId = generalSettings.currentTermId;
    if (!currentTermId) {
        console.warn("No current term ID set in general settings.");
        return []; 
    }

    const currentTermExams = allExams.filter(exam => exam.termId === currentTermId);
    if (currentTermExams.length === 0) {
        console.warn(`No exams found for current term ID: ${currentTermId}`);
        return [];
    }

    const assessments: Array<{id: string, name: string, maxMarks: number}> = [];
    const teacherAssignments = new Set<string>(); 

    allClasses.forEach(cls => {
        if (cls.classTeacherId === teacherId && Array.isArray(cls.subjects)) {
            cls.subjects.forEach(subj => {
                teacherAssignments.add(`${cls.id}-${subj.id}`);
            });
        }
    });

    if (teacher.subjectsAssigned && Array.isArray(teacher.subjectsAssigned)) {
        teacher.subjectsAssigned.forEach(assignment => {
            if (assignment.classId && assignment.subjectId) {
                 teacherAssignments.add(`${assignment.classId}-${assignment.subjectId}`);
            }
        });
    }
    
    teacherAssignments.forEach(assignmentKey => {
        const [classId, subjectId] = assignmentKey.split('-');
        const cls = allClasses.find(c => c.id === classId);
        let subj = allSubjectsGlobal.find(s => s.id === subjectId);

        if (cls && subj) {
            currentTermExams.forEach(exam => {
                assessments.push({
                    id: `${exam.id}_${cls.id}_${subj.id}`, 
                    name: `${cls.name} - ${subj.name} - ${exam.name}`,
                    maxMarks: exam.maxMarks,
                });
            });
        } else {
            if (!cls) console.warn(`Class not found for ID: ${classId} in assignmentKey: ${assignmentKey}`);
            if (cls && !subj) console.warn(`Subject not found for ID: ${subjectId} (globally) for assignmentKey: ${assignmentKey}`);
        }
    });
    
    assessments.sort((a, b) => a.name.localeCompare(b.name));

    return assessments;
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  const teacher = await getTeacherByIdFromDOS(teacherId);
  
  if (!teacher) {
    console.warn(`Teacher not found for ID: ${teacherId} in getTeacherDashboardData.`);
    return {
      assignments: [],
      notifications: [{ id: 'error_teacher_not_found', message: `Could not load data. Teacher record not found for ID: ${teacherId}. Please ensure the ID is correct or contact support.`, type: 'warning' }],
      teacherName: undefined,
      resourcesText: "Could not load resources. Teacher data missing or ID is incorrect."
    };
  }

  const [allClasses, generalSettings, allTerms, allExams, allSubjectsGlobal] = await Promise.all([ 
    getClasses(), 
    getGeneralSettings(),
    getTerms(),
    getExams(),
    getSubjects(),
  ]);

  const assignmentsMap = new Map<string, TeacherDashboardAssignment>();
  const notifications: TeacherNotification[] = [];
  const teacherName = teacher.name;
  const resourcesText = generalSettings.teacherDashboardResourcesText;

  const currentTermId = generalSettings.currentTermId;
  const currentTerm = currentTermId ? allTerms.find(t => t.id === currentTermId) : null;
  
  let deadlineText = "No specific deadline set";
  if (generalSettings.globalMarksSubmissionDeadline) {
    deadlineText = `Global: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
  } else if (currentTerm?.endDate) {
    deadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
  }

  const currentTermExams = currentTermId ? allExams.filter(exam => exam.termId === currentTermId) : [];

  if (currentTermId && currentTermExams.length > 0) {
    allClasses.forEach(cls => {
      if (cls.classTeacherId === teacher.id && Array.isArray(cls.subjects)) {
        cls.subjects.forEach(subj => {
          const assignmentId = `${cls.id}-${subj.id}`;
          if (!assignmentsMap.has(assignmentId)) {
            assignmentsMap.set(assignmentId, {
              id: assignmentId,
              className: cls.name,
              subjectName: subj.name,
              nextDeadlineInfo: deadlineText,
            });
          }
        });
      }
    });

    if (Array.isArray(teacher.subjectsAssigned)) {
      for (const assigned of teacher.subjectsAssigned) {
        const cls = allClasses.find(c => c.id === assigned.classId);
        const subjDetails = allSubjectsGlobal.find(s => s.id === assigned.subjectId); 

        if (cls && subjDetails) {
          const assignmentId = `${cls.id}-${subjDetails.id}`;
          if (!assignmentsMap.has(assignmentId)) { 
            assignmentsMap.set(assignmentId, {
              id: assignmentId,
              className: cls.name,
              subjectName: subjDetails.name,
              nextDeadlineInfo: deadlineText,
            });
          }
        }
      }
    }
  }
  
  const assignments = Array.from(assignmentsMap.values()).sort((a, b) => {
    if (a.className < b.className) return -1;
    if (a.className > b.className) return 1;
    if (a.subjectName < b.subjectName) return -1;
    if (a.subjectName > b.subjectName) return 1;
    return 0;
  });

  if (generalSettings.dosGlobalAnnouncementText) {
    notifications.push({
      id: 'dos_announcement',
      message: generalSettings.dosGlobalAnnouncementText,
      type: generalSettings.dosGlobalAnnouncementType || 'info',
    });
  }

  let deadlineDateToCompare: Date | null = null;
  let deadlineMessagePrefix = "";

  if (generalSettings.globalMarksSubmissionDeadline) {
    deadlineDateToCompare = new Date(generalSettings.globalMarksSubmissionDeadline);
    deadlineMessagePrefix = "Global marks submission deadline";
  } else if (currentTerm?.endDate) {
    deadlineDateToCompare = new Date(currentTerm.endDate);
    deadlineMessagePrefix = "Current term submission deadline (term end)";
  }

  if (deadlineDateToCompare) {
    const today = new Date();
    today.setHours(0,0,0,0); 
    deadlineDateToCompare.setHours(0,0,0,0); 

    const diffTime = deadlineDateToCompare.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) { 
      notifications.push({
        id: 'deadline_reminder',
        message: `${deadlineMessagePrefix} is ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`} (${deadlineDateToCompare.toLocaleDateString()}).`,
        type: 'deadline',
      });
    }
  }
  
  if (assignments.length === 0) {
    let noAssignmentMessage = 'No teaching assignments found for the current term.';
    if (!currentTermId) {
      noAssignmentMessage = 'No current academic term is set by the D.O.S. Assignments cannot be determined.';
    } else if (currentTermExams.length === 0) {
      noAssignmentMessage = 'No exams are scheduled for the current academic term. Assignments cannot be determined.';
    }
    notifications.push({
      id: 'no_assignments',
      message: noAssignmentMessage,
      type: 'info',
    });
  }
  
  return { assignments, notifications, teacherName, resourcesText };
}

    