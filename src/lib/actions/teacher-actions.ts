
"use server";

import type { Mark, GradeEntry, Student, TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";
import { getClasses, getSubjects, getExams, getGeneralSettings, getTeacherById, getTerms } from '@/lib/actions/dos-actions';
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

  // Prepare data for anomaly detection
  const gradeEntries: GradeEntry[] = data.marks.map(mark => ({
    studentId: mark.studentId, // This is studentIdNumber from the form
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
        };
        
        console.log("Anomaly detection input:", JSON.stringify(anomalyInput, null, 2));
        try {
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log("Anomaly detection result:", anomalyResult);
        } catch (error) {
            console.error("Error during anomaly detection:", error);
        }
    }
  }
  
  await delay(1000); 
  console.log(`Simulated saving ${data.marks.length} marks for assessment ${data.assessmentId} to database.`);
  data.marks.forEach(mark => {
    console.log(`DB_SAVE_MOCK: Student ${mark.studentId}, Score: ${mark.score}`);
  });

  revalidatePath("/teacher/marks/submit"); 
  revalidatePath("/teacher/marks/history"); 
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string }> {
    await delay(100); 
    if (assessmentId === "asm_math_midterm_f1a") {
        return { subjectName: "Mathematics", examName: "Midterm (Form 1A)" };
    }
    if (assessmentId === "asm_physics_final_f2b") {
        return { subjectName: "Physics", examName: "Final (Form 2B)" };
    }
    if (assessmentId === "asm_english_quiz1_f3c") {
        return { subjectName: "English", examName: "Quiz 1 (Form 3C)" };
    }
    console.warn(`No specific details found for assessmentId: ${assessmentId}. Returning generic names.`);
    return { subjectName: "Selected Subject", examName: "Selected Exam" }; 
}

export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  await delay(200); 
  
  if (assessmentId === "asm_math_midterm_f1a") {
    return [
      { id: 'st1', studentIdNumber: 'S1001', firstName: 'Alice', lastName: 'Wonder', classId: 'c1_f1a', dateOfBirth: '2010-05-10', gender: 'Female' },
      { id: 'st2', studentIdNumber: 'S1002', firstName: 'Bob', lastName: 'Builder', classId: 'c1_f1a', dateOfBirth: '2010-08-20', gender: 'Male' },
      { id: 'st3', studentIdNumber: 'S1003', firstName: 'Charlie', lastName: 'Chaplin', classId: 'c1_f1a', dateOfBirth: '2010-03-15', gender: 'Male' },
      { id: 'st_x_1', studentIdNumber: 'S1004', firstName: 'Brenda', lastName: 'Starr', classId: 'c1_f1a', dateOfBirth: '2010-01-01', gender: 'Female' },
      { id: 'st_x_2', studentIdNumber: 'S1005', firstName: 'Clark', lastName: 'Kent', classId: 'c1_f1a', dateOfBirth: '2010-02-02', gender: 'Male' },

    ];
  }
   if (assessmentId === "asm_physics_final_f2b") {
    return [
      { id: 'st4', studentIdNumber: 'S2001', firstName: 'Diana', lastName: 'Prince', classId: 'c2_f2b', dateOfBirth: '2009-05-10', gender: 'Female' },
      { id: 'st5', studentIdNumber: 'S2002', firstName: 'Edward', lastName: 'Scissorhands', classId: 'c2_f2b', dateOfBirth: '2009-08-20', gender: 'Male' },
    ];
  }
  if (assessmentId === "asm_english_quiz1_f3c") {
    return [
      { id: 'st6', studentIdNumber: 'S3001', firstName: 'Fiona', lastName: 'Gallagher', classId: 'c3_f3c', dateOfBirth: '2008-06-11', gender: 'Female' },
      { id: 'st7', studentIdNumber: 'S3002', firstName: 'George', lastName: 'Michael', classId: 'c3_f3c', dateOfBirth: '2008-09-22', gender: 'Male' },
      { id: 'st8', studentIdNumber: 'S3003', firstName: 'Harriet', lastName: 'Potter', classId: 'c3_f3c', dateOfBirth: '2008-04-18', gender: 'Female' },
    ];
  }
  return []; 
}

export async function getSubmittedMarksHistory(teacherId: string): Promise<any[]> {
    await delay(300);
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
    await delay(100);
    return [
        { id: "asm_math_midterm_f1a", name: "Mathematics - Midterm (Form 1A)", maxMarks: 100 },
        { id: "asm_physics_final_f2b", name: "Physics - Final (Form 2B)", maxMarks: 100 },
        { id: "asm_english_quiz1_f3c", name: "English - Quiz 1 (Form 3C)", maxMarks: 20 },
    ];
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  const [teacher, allClasses, generalSettings, allTerms] = await Promise.all([
    getTeacherById(teacherId),
    getClasses(), // This already fetches subjects for each class
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

    // Assignments from teacher.subjectsAssigned (specific subject/class combos)
    if (teacher.subjectsAssigned) {
      for (const assigned of teacher.subjectsAssigned) {
        const cls = allClasses.find(c => c.id === assigned.classId);
        // Subjects are already part of cls.subjects if fetched by getClasses correctly
        const subjDetails = cls?.subjects.find(s => s.id === assigned.subjectId);

        if (cls && subjDetails) {
          const assignmentId = `${cls.id}-${subjDetails.id}`;
          if (!assignmentsMap.has(assignmentId)) { // Avoid duplicates
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
    today.setHours(0,0,0,0); // Normalize today
    deadlineDateToCompare.setHours(0,0,0,0); // Normalize deadline

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
  
  notifications.push({ message: "System maintenance scheduled for July 22nd, 2 AM - 4 AM.", type: "warning", id: "system_maintenance" });

  return { assignments, notifications, teacherName, resourcesText };
}
