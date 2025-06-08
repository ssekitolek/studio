
"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Teacher Management ---
export async function createTeacher(teacherData: Omit<Teacher, 'id'>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  try {
    console.log("Creating teacher:", teacherData);
    // Replace with Firestore addDoc
    // const docRef = await addDoc(collection(db, "teachers"), teacherData);
    // const newTeacher: Teacher = { id: docRef.id, ...teacherData };
    await delay(500); // Keep delay for mock, replace with actual db operation
    const newTeacher: Teacher = { ...teacherData, id: Math.random().toString(36).substring(7) }; // Mock ID
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher created successfully (mock).", teacher: newTeacher };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create teacher: ${errorMessage}` };
  }
}

export async function updateTeacher(teacherId: string, teacherData: Partial<Teacher>): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating teacher ${teacherId}:`, teacherData);
    // Replace with Firestore updateDoc
    // const teacherRef = doc(db, "teachers", teacherId);
    // await updateDoc(teacherRef, teacherData);
    await delay(500); // Keep delay for mock
    revalidatePath(`/dos/teachers`);
    revalidatePath(`/dos/teachers/${teacherId}/edit`);
    return { success: true, message: "Teacher updated successfully (mock)." };
  } catch (error) {
    console.error(`Error in updateTeacher for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update teacher: ${errorMessage}` };
  }
}

export async function deleteTeacher(teacherId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Deleting teacher:", teacherId);
    // Replace with Firestore deleteDoc
    // await deleteDoc(doc(db, "teachers", teacherId));
    await delay(500); // Keep delay for mock
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher deleted successfully (mock)." };
  } catch (error) {
    console.error(`Error in deleteTeacher for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete teacher: ${errorMessage}` };
  }
}

// --- Student Management ---
export async function createStudent(studentData: Omit<Student, 'id'>): Promise<{ success: boolean; message: string; student?: Student }> {
  try {
    console.log("Creating student:", studentData);
    await delay(500);
    const newStudent: Student = { ...studentData, id: Math.random().toString(36).substring(7) };
    revalidatePath("/dos/students");
    return { success: true, message: "Student registered successfully (mock).", student: newStudent };
  } catch (error) {
    console.error("Error in createStudent:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to register student: ${errorMessage}` };
  }
}

export async function updateStudent(studentId: string, studentData: Partial<Student>): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating student ${studentId}:`, studentData);
    await delay(500);
    revalidatePath("/dos/students");
    revalidatePath(`/dos/students/${studentId}/edit`);
    return { success: true, message: "Student updated successfully (mock)." };
  } catch (error) {
    console.error(`Error in updateStudent for ${studentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update student: ${errorMessage}` };
  }
}

export async function deleteStudent(studentId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Deleting student:", studentId);
    await delay(500);
    revalidatePath("/dos/students");
    return { success: true, message: "Student deleted successfully (mock)." };
  } catch (error) {
    console.error(`Error in deleteStudent for ${studentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete student: ${errorMessage}` };
  }
}

// --- Class & Subject Management ---
export async function createClass(classData: Omit<ClassInfo, 'id' | 'subjects'> & { subjectIds: string[] }): Promise<{ success: boolean; message: string; classInfo?: ClassInfo }> {
  try {
    console.log("Creating class:", classData);
    await delay(500);
    const subjects: Subject[] = classData.subjectIds.map(id => ({ id, name: `Subject ${id}` }));
    const newClass: ClassInfo = { ...classData, id: Math.random().toString(36).substring(7), subjects };
    revalidatePath("/dos/classes");
    return { success: true, message: "Class created successfully (mock).", classInfo: newClass };
  } catch (error) {
    console.error("Error in createClass:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create class: ${errorMessage}` };
  }
}

export async function updateClass(classId: string, classData: Partial<ClassInfo>): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating class ${classId}:`, classData);
    await delay(500);
    revalidatePath("/dos/classes");
    return { success: true, message: "Class updated successfully (mock)." };
  } catch (error) {
    console.error(`Error in updateClass for ${classId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update class: ${errorMessage}` };
  }
}

export async function createSubject(subjectData: Omit<Subject, 'id'>): Promise<{ success: boolean; message: string; subject?: Subject }> {
  try {
    console.log("Creating subject:", subjectData);
    await delay(500);
    const newSubject: Subject = { ...subjectData, id: Math.random().toString(36).substring(7) };
    revalidatePath("/dos/classes");
    return { success: true, message: "Subject created successfully (mock).", subject: newSubject };
  } catch (error) {
    console.error("Error in createSubject:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create subject: ${errorMessage}` };
  }
}


// --- Term & Exam Management ---
export async function createTerm(termData: Omit<Term, 'id'>): Promise<{ success: boolean; message: string; term?: Term }> {
  try {
    console.log("Creating term:", termData);
    await delay(500);
    const newTerm: Term = { ...termData, id: Math.random().toString(36).substring(7) };
    revalidatePath("/dos/settings/terms");
    return { success: true, message: "Term created successfully (mock).", term: newTerm };
  } catch (error) {
    console.error("Error in createTerm:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create term: ${errorMessage}` };
  }
}

export async function createExam(examData: Omit<Exam, 'id'>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  try {
    console.log("Creating exam:", examData);
    await delay(500);
    const newExam: Exam = { ...examData, id: Math.random().toString(36).substring(7) };
    revalidatePath("/dos/settings/exams");
    return { success: true, message: "Exam created successfully (mock).", exam: newExam };
  } catch (error) {
    console.error("Error in createExam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create exam: ${errorMessage}` };
  }
}

export async function updateGeneralSettings(settings: GeneralSettings): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Updating general settings:", settings);
    await delay(500);
    revalidatePath("/dos/settings/general");
    return { success: true, message: "General settings updated (mock)." };
  } catch (error) {
    console.error("Error in updateGeneralSettings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update general settings: ${errorMessage}` };
  }
}

export async function downloadAllMarks(): Promise<{ success: boolean; message: string; data?: string }> {
  try {
    console.log("Downloading all marks requested.");
    await delay(1000);
    const csvData = "StudentID,StudentName,Class,Subject,Exam,Score\nS1001,John Doe,Form 1A,Math,Midterm,85\nS1002,Jane Smith,Form 1A,Math,Midterm,92";
    return { success: true, message: "Marks data prepared for download (mock).", data: csvData };
  } catch (error) {
    console.error("Error in downloadAllMarks:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to prepare marks data: ${errorMessage}` };
  }
}

// Data fetch functions
export async function getTeachers(): Promise<Teacher[]> {
  try {
    const teachersCol = collection(db, "teachers");
    const teacherSnapshot = await getDocs(teachersCol);
    const teachersList = teacherSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
    return teachersList;
  } catch (error) {
    console.error("Error fetching teachers from Firestore:", error);
    // Fallback to mock data or rethrow, for now returning empty or mock
    return [ // Mock data as fallback
      { id: 't1', name: 'Mr. Harrison (Firestore Error)', email: 'harrison@example.com', subjectsAssigned: [{classId: 'c1', subjectId: 's1'}] },
      { id: 't2', name: 'Ms. Priya (Firestore Error)', email: 'priya@example.com', subjectsAssigned: [{classId: 'c1', subjectId: 's2'}, {classId: 'c2', subjectId: 's1'}] },
    ];
  }
}

export async function getStudents(): Promise<Student[]> {
  try {
    await delay(100); // Simulating async operation
    // Replace with Firestore fetch if students collection is ready
    return [
      { id: 'st1', studentIdNumber: 'S1001', firstName: 'Alice', lastName: ' Wonderland', classId: 'c1' },
      { id: 'st2', studentIdNumber: 'S1002', firstName: 'Bob', lastName: 'The Builder', classId: 'c1' },
      { id: 'st3', studentIdNumber: 'S1003', firstName: 'Charlie', lastName: 'Brown', classId: 'c2' },
    ];
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function getClasses(): Promise<ClassInfo[]> {
    try {
        await delay(100);
        return [
            { id: 'c1', name: 'Form 1A', level: 'Form 1', stream: 'A', subjects: [{id: 's1', name: 'Mathematics'}, {id: 's2', name: 'English'}], classTeacherId: 't1', teachers:[] },
            { id: 'c2', name: 'Form 1B', level: 'Form 1', stream: 'B', subjects: [{id: 's1', name: 'Mathematics'}, {id: 's3', name: 'Science'}], classTeacherId: 't2', teachers: [] },
        ];
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
}

export async function getSubjects(): Promise<Subject[]> {
    try {
        await delay(100);
        return [
            { id: 's1', name: 'Mathematics', code: 'MATH'},
            { id: 's2', name: 'English', code: 'ENG'},
            { id: 's3', name: 'Science', code: 'SCI'},
            { id: 's4', name: 'History', code: 'HIST'},
        ];
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
}

export async function getTerms(): Promise<Term[]> {
    try {
        await delay(100);
        return [
            { id: 'term1', name: 'Term 1 2024', year: 2024, startDate: '2024-01-15', endDate: '2024-04-15'},
            { id: 'term2', name: 'Term 2 2024', year: 2024, startDate: '2024-05-10', endDate: '2024-08-10'},
        ];
    } catch (error) {
        console.error("Error fetching terms:", error);
        return [];
    }
}

export async function getExams(): Promise<Exam[]> {
    try {
        await delay(100);
        return [
            { id: 'exam1', name: 'Midterm Exam', termId: 'term1', maxMarks: 100, description: 'Covers first half of syllabus.' },
            { id: 'exam2', name: 'Final Exam', termId: 'term1', maxMarks: 100, description: 'Comprehensive final exam.' },
        ];
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
    try {
        await delay(100);
        return {
            defaultGradingScale: [
                { grade: 'A', minScore: 80, maxScore: 100 },
                { grade: 'B', minScore: 70, maxScore: 79 },
                { grade: 'C', minScore: 60, maxScore: 69 },
            ],
            currentTermId: 'term1',
            markSubmissionTimeZone: 'Africa/Nairobi',
        };
    } catch (error) {
        console.error("Error fetching general settings:", error);
        // Return a default or throw
        return { defaultGradingScale: [], markSubmissionTimeZone: 'UTC' };
    }
}
