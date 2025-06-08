
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams, getGeneralSettings, getTeacherById, getTerms, getStudents as getAllStudents } from '@/lib/actions/dos-actions';
import type { ClassInfo, Subject as SubjectType, Exam, GeneralSettings, Teacher, Term } from '@/lib/types';


// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface MarksSubmissionData {
  assessmentId: string;
  marks: Array<{ studentId: string; score: number }>; // score should be number by this point
}

export async function submitMarks(data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log("Submitting marks:", data);

  if (!data.assessmentId || !data.marks) {
    return { success: false, message: "Invalid submission data. Assessment ID and marks are required." };
  }

  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId,
    grade: mark.score,
  }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;

  if (gradeEntries.length > 0) {
    const assessmentDetails = await getAssessmentDetails(data.assessmentId); 

    if (!assessmentDetails.subjectName || !assessmentDetails.examName) {
        console.error("Could not retrieve subject name or exam name for anomaly detection for assessmentId:", data.assessmentId);
    } else {
        const anomalyInput: GradeAnomalyDetectionInput = {
          subject: assessmentDetails.subjectName,
          exam: assessmentDetails.examName,
          grades: gradeEntries,
          // historicalAverage: assessmentDetails.historicalAverage, // Could be added in future
        };
        
        console.log("Anomaly detection input:", JSON.stringify(anomalyInput, null, 2));
        try {
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log("Anomaly detection result:", anomalyResult);
        } catch (error) {
            console.error("Error during anomaly detection:", error);
            // Continue submission even if anomaly detection fails for some reason
            anomalyResult = { hasAnomalies: false, anomalies: [{studentId: "SYSTEM_ERROR", explanation: "Anomaly check failed to run."}] };
        }
    }
  }
  
  await delay(1000); 
  console.log(`Simulated saving ${data.marks.length} marks for assessment ${data.assessmentId} to database.`);
  // In a real app, here you would interact with Firestore to save the marks.
  // For example, for each mark in data.marks:
  // await addDoc(collection(db, "marks"), { 
  //   assessmentId: data.assessmentId, 
  //   studentId: mark.studentId, // This is studentIdNumber
  //   score: mark.score,
  //   submittedAt: new Date().toISOString(),
  // });

  revalidatePath("/teacher/marks/submit"); 
  revalidatePath("/teacher/marks/history"); 
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string }> {
    const parts = assessmentId.split('_');
    if (parts.length !== 3) {
        console.error(`Invalid assessmentId format: ${assessmentId}`);
        return { subjectName: "Unknown Subject", examName: "Unknown Exam" };
    }
    const [examId, , subjectId] = parts; // classId is also in parts[1] if needed

    const allExams = await getExams();
    const allSubjects = await getSubjects();

    const exam = allExams.find(e => e.id === examId);
    const subject = allSubjects.find(s => s.id === subjectId);

    return {
        subjectName: subject?.name || "Unknown Subject",
        examName: exam?.name || "Unknown Exam",
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

export async function getSubmittedMarksHistory(teacherId: string): Promise<any[]> {
    await delay(300);
    // This remains mock data for now. In a real app, query Firestore for actual submissions.
    return [
        { 
            id: 'sub1_math_f1a', 
            assessmentName: 'Form 1A - Mathematics - Midterm', 
            dateSubmitted: '2024-07-15', 
            studentCount: 25, 
            averageScore: 78.5,
            status: 'Accepted' 
        },
        { 
            id: 'sub2_phy_f2b', 
            assessmentName: 'Form 2B - Physics - Final', 
            dateSubmitted: '2024-07-18', 
            studentCount: 22, 
            averageScore: 65.2,
            status: 'Pending Review (Anomaly Detected)'
        },
         { 
            id: 'sub3_eng_f3c', 
            assessmentName: 'Form 3C - English - Quiz 1', 
            dateSubmitted: '2024-07-20', 
            studentCount: 30, 
            averageScore: 15.7, 
            status: 'Accepted' 
        },
    ];
}

export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) return [];

    const [allExams, allClasses, generalSettings, allTerms] = await Promise.all([
        getExams(),
        getClasses(), // getClasses now includes subjects for each class
        getGeneralSettings(),
        getTerms(),
    ]);

    const currentTermId = generalSettings.currentTermId;
    if (!currentTermId) return []; // No assessments if no current term is set

    const currentTermExams = allExams.filter(exam => exam.termId === currentTermId);
    if (currentTermExams.length === 0) return [];

    const assessments: Array<{id: string, name: string, maxMarks: number}> = [];
    const teacherAssignments = new Set<string>(); // Store as "classId-subjectId"

    // Populate teacherAssignments based on class teacher role
    allClasses.forEach(cls => {
        if (cls.classTeacherId === teacherId) {
            cls.subjects.forEach(subj => {
                teacherAssignments.add(`${cls.id}-${subj.id}`);
            });
        }
    });

    // Populate teacherAssignments based on specific subject assignments
    if (teacher.subjectsAssigned) {
        teacher.subjectsAssigned.forEach(assignment => {
            teacherAssignments.add(`${assignment.classId}-${assignment.subjectId}`);
        });
    }

    // Generate assessments
    teacherAssignments.forEach(assignmentKey => {
        const [classId, subjectId] = assignmentKey.split('-');
        const cls = allClasses.find(c => c.id === classId);
        const subj = cls?.subjects.find(s => s.id === subjectId); // Subjects are nested in class

        if (cls && subj) {
            currentTermExams.forEach(exam => {
                assessments.push({
                    id: `${exam.id}_${cls.id}_${subj.id}`, // Composite ID
                    name: `${cls.name} - ${subj.name} - ${exam.name}`,
                    maxMarks: exam.maxMarks,
                });
            });
        }
    });
    
    // Sort assessments for consistent display
    assessments.sort((a, b) => a.name.localeCompare(b.name));

    return assessments;
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  const [teacher, allClasses, generalSettings, allTerms] = await Promise.all([
    getTeacherById(teacherId),
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
    // Assignments where the teacher is the class teacher
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

    // Assignments from teacher.subjectsAssigned
    if (teacher.subjectsAssigned) {
      for (const assigned of teacher.subjectsAssigned) {
        const cls = allClasses.find(c => c.id === assigned.classId);
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


  // Notifications
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
  
  // Example static notification, can be made dynamic if needed
  // notifications.push({ message: "System maintenance scheduled for July 22nd, 2 AM - 4 AM.", type: "warning", id: "system_maintenance" });

  return { assignments, notifications, teacherName, resourcesText };
}

    