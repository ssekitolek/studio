
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification, Teacher as TeacherType, AnomalyExplanation } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams, getGeneralSettings, getTeacherById as getTeacherByIdFromDOS, getTerms, getStudents as getAllStudents } from '@/lib/actions/dos-actions';
import type { ClassInfo, Subject as SubjectType, Exam, GeneralSettings, Term } from '@/lib/types';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, addDoc, orderBy, Timestamp } from "firebase/firestore";

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
    return { success: false, message: "Database service is not available." };
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
    console.error("Error during teacher login:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Login failed: ${errorMessage}` };
  }
}


export async function submitMarks(teacherId: string, data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log("Submitting marks for teacher:", teacherId, "Data:", data);

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
        };
        
        console.log("Anomaly detection input:", JSON.stringify(anomalyInput, null, 2));
        try {
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log("Anomaly detection result:", anomalyResult);
        } catch (error) {
            console.error("Error during anomaly detection:", error);
            anomalyResult = { hasAnomalies: false, anomalies: [{studentId: "SYSTEM_ERROR", explanation: "Anomaly check failed to run."}] };
        }
    }
  }
  
  // Calculate stats for submission record
  const studentCount = data.marks.length;
  const totalScore = data.marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
  const averageScore = studentCount > 0 ? totalScore / studentCount : null;
  
  const initialStatus: SubmissionHistoryItem['status'] = anomalyResult?.hasAnomalies ? "Pending Review (Anomaly Detected)" : "Accepted";

  // Save to markSubmissions collection
  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    await addDoc(markSubmissionsRef, {
      teacherId,
      assessmentId: data.assessmentId,
      assessmentName: assessmentDetails.name, // Use the full name from assessmentDetails
      dateSubmitted: Timestamp.now(), // Use Firestore Timestamp for better querying
      studentCount,
      averageScore,
      status: initialStatus,
      submittedMarks: data.marks, // Store the actual marks
      anomalyExplanations: anomalyResult?.anomalies || [],
    });
  } catch (error) {
    console.error("Error saving mark submission to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to save submission: ${errorMessage}` };
  }

  revalidatePath("/teacher/marks/submit"); 
  revalidatePath("/teacher/marks/history"); 
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string; name: string; maxMarks: number }> {
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.error(`Invalid assessmentId format: ${assessmentId}`);
        return { subjectName: "Unknown Subject", examName: "Unknown Exam", name: "Unknown Assessment", maxMarks: 100 };
    }
    const [examId, classId, subjectId] = parts;

    const allExams = await getExams();
    const allSubjects = await getSubjects();
    const allClasses = await getClasses(); // Need class name too

    const exam = allExams.find(e => e.id === examId);
    const subject = allSubjects.find(s => s.id === subjectId);
    const cls = allClasses.find(c => c.id === classId);

    const assessmentName = `${cls?.name || 'Unknown Class'} - ${subject?.name || 'Unknown Subject'} - ${exam?.name || 'Unknown Exam'}`;
    
    return {
        subjectName: subject?.name || "Unknown Subject",
        examName: exam?.name || "Unknown Exam",
        name: assessmentName,
        maxMarks: exam?.maxMarks || 100,
    };
}

export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  const parts = assessmentId.split('_');
  if (parts.length !== 3) {
      console.error(`Invalid assessmentId format for fetching students: ${assessmentId}`);
      return [];
  }
  const classId = parts[1];

  const allStudents = await getAllStudents(); // Fetches all students from dos-actions
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
        const history: SubmissionHistoryItem[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
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

    const [allExams, allClasses, generalSettings] = await Promise.all([
        getExams(),
        getClasses(), 
        getGeneralSettings(),
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
        if (cls.classTeacherId === teacherId) {
            cls.subjects.forEach(subj => {
                teacherAssignments.add(`${cls.id}-${subj.id}`);
            });
        }
    });

    if (teacher.subjectsAssigned) {
        teacher.subjectsAssigned.forEach(assignment => {
            teacherAssignments.add(`${assignment.classId}-${assignment.subjectId}`);
        });
    }

    teacherAssignments.forEach(assignmentKey => {
        const [classId, subjectId] = assignmentKey.split('-');
        const cls = allClasses.find(c => c.id === classId);
        const allSubjectsMasterList = cls?.subjects; // Subjects configured for this class
        const subj = allSubjectsMasterList?.find(s => s.id === subjectId); 


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
            if (cls && !subj) console.warn(`Subject not found for ID: ${subjectId} in class ${cls.name} (ID: ${cls.id}) for assignmentKey: ${assignmentKey}`);
        }
    });
    
    assessments.sort((a, b) => a.name.localeCompare(b.name));

    return assessments;
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  const [teacher, allClasses, generalSettings, allTerms] = await Promise.all([
    getTeacherByIdFromDOS(teacherId), 
    getClasses(), 
    getGeneralSettings(),
    getTerms(),
  ]);

  const assignmentsMap = new Map<string, TeacherDashboardAssignment>();
  const notifications: TeacherNotification[] = [];
  const teacherName = teacher?.name;
  const resourcesText = generalSettings.teacherDashboardResourcesText;

  const currentTerm = generalSettings.currentTermId ? allTerms.find(t => t.id === generalSettings.currentTermId) : null;
  let deadlineText = "No specific deadline set";
  if (generalSettings.globalMarksSubmissionDeadline) {
    deadlineText = `Global: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
  } else if (currentTerm?.endDate) {
    deadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
  }

  if (teacher) {
    allClasses.forEach(cls => {
      if (cls.classTeacherId === teacher.id && cls.subjects) {
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

    if (teacher.subjectsAssigned) {
      for (const assigned of teacher.subjectsAssigned) {
        const cls = allClasses.find(c => c.id === assigned.classId);
        
        // Find subject details from the class's subject list
        const subjDetails = cls?.subjects.find(s => s.id === assigned.subjectId);

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
  
  return { assignments, notifications, teacherName, resourcesText };
}

