
"use server";

import type { Mark, GradeEntry, Student } from "@/lib/types";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import { revalidatePath } from "next/cache";

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
        // Decide if this should be a blocking error or just a warning
        // For now, we'll proceed without anomaly detection if details are missing, but log it.
    } else {
        const anomalyInput: GradeAnomalyDetectionInput = {
          subject: assessmentDetails.subjectName,
          exam: assessmentDetails.examName,
          grades: gradeEntries,
          // historicalAverage: 75, // Optional: fetch historical average if available
        };
        
        console.log("Anomaly detection input:", JSON.stringify(anomalyInput, null, 2));
        try {
            anomalyResult = await gradeAnomalyDetection(anomalyInput);
            console.log("Anomaly detection result:", anomalyResult);
        } catch (error) {
            console.error("Error during anomaly detection:", error);
            // Log and continue, or return error, based on policy
            // return { success: false, message: `Error during anomaly detection: ${error instanceof Error ? error.message : String(error)}`};
        }
    }
  }
  
  // Simulate saving marks to a database
  await delay(1000); 
  console.log(`Simulated saving ${data.marks.length} marks for assessment ${data.assessmentId} to database.`);
  data.marks.forEach(mark => {
    // In a real app, you'd do something like:
    // await db.collection('marks').add({ assessmentId: data.assessmentId, studentId: mark.studentId, score: mark.score, submittedAt: new Date() });
    console.log(`DB_SAVE_MOCK: Student ${mark.studentId}, Score: ${mark.score}`);
  });

  revalidatePath("/teacher/marks/submit"); // To allow for resubmission or new submissions
  revalidatePath("/teacher/marks/history"); // To update the list of past submissions
  
  if (anomalyResult?.hasAnomalies) {
    return { success: true, message: "Marks submitted. Potential anomalies were detected and logged.", anomalies: anomalyResult };
  }

  return { success: true, message: "Marks submitted successfully. No anomalies detected." };
}


// Dummy function to simulate fetching assessment details
async function getAssessmentDetails(assessmentId: string): Promise<{ subjectName: string; examName: string }> {
    await delay(100); // Simulate network latency
    // In a real app, you would query your database based on assessmentId.
    // This might involve looking up an 'assessments' collection that links
    // exam types, subjects, classes, and teachers.
    
    // Placeholder logic based on example assessment IDs:
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
    return { subjectName: "Selected Subject", examName: "Selected Exam" }; // Fallback
}

// Dummy function to get students for a class and subject (assessment)
export async function getStudentsForAssessment(assessmentId: string): Promise<Student[]> {
  await delay(200); // Simulate network latency
  // This would depend on how assessmentId links to a class.
  // For instance, assessmentId might be structured or you might query an 'assessments' collection
  // to find the classId, then query 'students' collection for students in that class.
  
  // Placeholder data:
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
  return []; // Return empty array if no match
}

// Dummy data for teacher's view of their submitted marks
export async function getSubmittedMarksHistory(teacherId: string): Promise<any[]> {
    await delay(300);
    // In a real app, query the 'marksSubmissions' or equivalent collection, filtered by teacherId.
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
            averageScore: 65.2, // Example: this might have triggered an anomaly
            status: 'Pending Review (Anomaly Detected)'
        },
         { 
            id: 'sub3_eng_f3c', 
            assessmentName: 'Form 3C - English - Quiz 1', 
            dateSubmitted: '2024-07-20', 
            studentCount: 30, 
            averageScore: 15.7, // out of 20
            status: 'Accepted' 
        },
    ];
}

// Dummy data for selectable assessments for a teacher
export async function getTeacherAssessments(teacherId: string): Promise<Array<{id: string, name: string, maxMarks: number}>> {
    await delay(100);
    // In a real app, query assessments assigned to this teacher that are pending submission or open for marking.
    // This might involve looking at a Teacher -> Class -> Subject assignment, then Term -> ExamType.
    return [
        { id: "asm_math_midterm_f1a", name: "Mathematics - Midterm (Form 1A)", maxMarks: 100 },
        { id: "asm_physics_final_f2b", name: "Physics - Final (Form 2B)", maxMarks: 100 },
        { id: "asm_english_quiz1_f3c", name: "English - Quiz 1 (Form 3C)", maxMarks: 20 },
    ];
}


    