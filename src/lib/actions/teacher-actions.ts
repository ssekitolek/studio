"use server";

import type { Mark, GradeEntry, Student } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface MarksSubmissionData {
  assessmentId: string;
  marks: Array<{ studentId: string; score: number | null }>;
}

export async function submitMarks(data: MarksSubmissionData): Promise<{ success: boolean; message: string; anomalies?: GradeAnomalyDetectionOutput }> {
  console.log("Submitting marks:", data);

  // Prepare data for anomaly detection
  const gradeEntries: GradeEntry[] = data.marks
    .filter(mark => mark.score !== null)
    .map(mark => ({
      studentId: mark.studentId, // This should be the student's official ID number
      grade: mark.score!,
    }));

  let anomalyResult: GradeAnomalyDetectionOutput | undefined = undefined;

  if (gradeEntries.length > 0) {
    // For anomaly detection, we need subject and exam names. These would typically be part of `assessmentId`'s related data.
    // Fetching them here is simplified.
    const dummyAssessmentDetails = await getAssessmentDetails(data.assessmentId); // You'd fetch real details

    const anomalyInput: GradeAnomalyDetectionInput = {
      subject: dummyAssessmentDetails.subjectName,
      exam: dummyAssessmentDetails.examName,
      grades: gradeEntries,
      // historicalAverage: 75, // Optional: fetch historical average if available
    };
    
    console.log("Anomaly detection input:", JSON.stringify(anomalyInput, null, 2));
    try {
        anomalyResult = await gradeAnomalyDetection(anomalyInput);
        console.log("Anomaly detection result:", anomalyResult);
    } catch (error) {
        console.error("Error during anomaly detection:", error);
        // Decide if this error should prevent marks submission or just be logged
    }
  }
  
  // Simulate saving marks
  await delay(1000); 
  
  // In a real app, save each mark to the database
  // For now, just log them
  data.marks.forEach(mark => {
    console.log(`Mark for student ${mark.studentId}: ${mark.score}`);
  });

  revalidatePath("/teacher/marks/submit");
  revalidatePath("/teacher/marks/history");
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted, but potential anomalies detected. Please review.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully." };
}


// Dummy function to simulate fetching assessment details
async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string }> {
    await delay(100);
    // In a real app, you would query your database based on assessmentId
    // For example:
    // const assessment = await db.assessments.findUnique({ where: { id: assessmentId }, include: { subject: true, exam: true } });
    // return { subjectName: assessment.subject.name, examName: assessment.exam.name };
    
    // Placeholder:
    if (assessmentId === "asm_math_midterm_f1a") {
        return { subjectName: "Mathematics", examName: "Midterm F1A" };
    }
    if (assessmentId === "asm_physics_final_f2b") {
        return { subjectName: "Physics", examName: "Final F2B" };
    }
    return { subjectName: "Unknown Subject", examName: "Unknown Exam" };
}

// Dummy function to get students for a class and subject (assessment)
export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  await delay(200);
  // This would depend on how assessmentId links to class and subject
  // For now, returning some dummy students
  if (assessmentId === "asm_math_midterm_f1a") {
    return [
      { id: 'st1', studentIdNumber: 'S1001', firstName: 'Alice', lastName: 'Wonder', classId: 'c1', dateOfBirth: '2010-05-10', gender: 'Female' },
      { id: 'st2', studentIdNumber: 'S1002', firstName: 'Bob', lastName: 'Builder', classId: 'c1', dateOfBirth: '2010-08-20', gender: 'Male' },
      { id: 'st3', studentIdNumber: 'S1003', firstName: 'Charlie', lastName: 'Chaplin', classId: 'c1', dateOfBirth: '2010-03-15', gender: 'Male' },
    ];
  }
   if (assessmentId === "asm_physics_final_f2b") {
    return [
      { id: 'st4', studentIdNumber: 'S2001', firstName: 'Diana', lastName: 'Prince', classId: 'c2', dateOfBirth: '2009-05-10', gender: 'Female' },
      { id: 'st5', studentIdNumber: 'S2002', firstName: 'Edward', lastName: 'Scissorhands', classId: 'c2', dateOfBirth: '2009-08-20', gender: 'Male' },
    ];
  }
  return [];
}

// Dummy data for teacher's view of their submitted marks
export async function getSubmittedMarksHistory(teacherId: string): Promise<any[]> {
    await delay(300);
    return [
        { 
            id: 'sub1', 
            assessmentName: 'Form 1A - Mathematics - Midterm', 
            dateSubmitted: '2024-07-15', 
            studentCount: 25, 
            averageScore: 78.5,
            status: 'Accepted' 
        },
        { 
            id: 'sub2', 
            assessmentName: 'Form 2B - Physics - Final', 
            dateSubmitted: '2024-07-18', 
            studentCount: 22, 
            averageScore: 65.2,
            status: 'Pending Review (Anomaly Detected)'
        },
    ];
}

// Dummy data for selectable assessments for a teacher
export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    await delay(100);
    // In a real app, query assessments assigned to this teacher that are pending submission
    return [
        { id: "asm_math_midterm_f1a", name: "Mathematics - Midterm (Form 1A)", maxMarks: 100 },
        { id: "asm_physics_final_f2b", name: "Physics - Final (Form 2B)", maxMarks: 100 },
        { id: "asm_english_quiz1_f3c", name: "English - Quiz 1 (Form 3C)", maxMarks: 20 },
    ];
}
