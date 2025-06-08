"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Teacher Management ---
export async function createTeacher(teacherData: Omit<Teacher, 'id'>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  console.log("Creating teacher:", teacherData);
  await delay(500);
  // In a real app, save to DB and get an ID
  const newTeacher: Teacher = { ...teacherData, id: Math.random().toString(36).substring(7) };
  revalidatePath("/dos/teachers");
  return { success: true, message: "Teacher created successfully.", teacher: newTeacher };
}

export async function updateTeacher(teacherId: string, teacherData: Partial<Teacher>): Promise<{ success: boolean; message: string }> {
  console.log(`Updating teacher ${teacherId}:`, teacherData);
  await delay(500);
  revalidatePath(`/dos/teachers`);
  revalidatePath(`/dos/teachers/${teacherId}/edit`);
  return { success: true, message: "Teacher updated successfully." };
}

export async function deleteTeacher(teacherId: string): Promise<{ success: boolean; message: string }> {
  console.log("Deleting teacher:", teacherId);
  await delay(500);
  revalidatePath("/dos/teachers");
  return { success: true, message: "Teacher deleted successfully." };
}

// --- Student Management ---
export async function createStudent(studentData: Omit<Student, 'id'>): Promise<{ success: boolean; message: string; student?: Student }> {
  console.log("Creating student:", studentData);
  await delay(500);
  const newStudent: Student = { ...studentData, id: Math.random().toString(36).substring(7) };
  revalidatePath("/dos/students");
  return { success: true, message: "Student registered successfully.", student: newStudent };
}

export async function updateStudent(studentId: string, studentData: Partial<Student>): Promise<{ success: boolean; message: string }> {
  console.log(`Updating student ${studentId}:`, studentData);
  await delay(500);
  revalidatePath("/dos/students");
  revalidatePath(`/dos/students/${studentId}/edit`);
  return { success: true, message: "Student updated successfully." };
}

export async function deleteStudent(studentId: string): Promise<{ success: boolean; message: string }> {
  console.log("Deleting student:", studentId);
  await delay(500);
  revalidatePath("/dos/students");
  return { success: true, message: "Student deleted successfully." };
}

// --- Class & Subject Management ---
export async function createClass(classData: Omit<ClassInfo, 'id' | 'subjects'> & { subjectIds: string[] }): Promise<{ success: boolean; message: string; classInfo?: ClassInfo }> {
  console.log("Creating class:", classData);
  await delay(500);
  // Dummy subject objects based on IDs
  const subjects: Subject[] = classData.subjectIds.map(id => ({ id, name: `Subject ${id}` }));
  const newClass: ClassInfo = { ...classData, id: Math.random().toString(36).substring(7), subjects };
  revalidatePath("/dos/classes");
  return { success: true, message: "Class created successfully.", classInfo: newClass };
}

export async function updateClass(classId: string, classData: Partial<ClassInfo>): Promise<{ success: boolean; message: string }> {
  console.log(`Updating class ${classId}:`, classData);
  await delay(500);
  revalidatePath("/dos/classes");
  return { success: true, message: "Class updated successfully." };
}

export async function createSubject(subjectData: Omit<Subject, 'id'>): Promise<{ success: boolean; message: string; subject?: Subject }> {
  console.log("Creating subject:", subjectData);
  await delay(500);
  const newSubject: Subject = { ...subjectData, id: Math.random().toString(36).substring(7) };
  revalidatePath("/dos/classes"); // Assuming subjects are managed/viewed alongside classes
  return { success: true, message: "Subject created successfully.", subject: newSubject };
}


// --- Term & Exam Management ---
export async function createTerm(termData: Omit<Term, 'id'>): Promise<{ success: boolean; message: string; term?: Term }> {
  console.log("Creating term:", termData);
  await delay(500);
  const newTerm: Term = { ...termData, id: Math.random().toString(36).substring(7) };
  revalidatePath("/dos/settings/terms");
  return { success: true, message: "Term created successfully.", term: newTerm };
}

export async function createExam(examData: Omit<Exam, 'id'>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  console.log("Creating exam:", examData);
  await delay(500);
  const newExam: Exam = { ...examData, id: Math.random().toString(36).substring(7) };
  revalidatePath("/dos/settings/exams");
  return { success: true, message: "Exam created successfully.", exam: newExam };
}

export async function updateGeneralSettings(settings: GeneralSettings): Promise<{ success: boolean; message: string }> {
  console.log("Updating general settings:", settings);
  await delay(500);
  revalidatePath("/dos/settings/general");
  return { success: true, message: "General settings updated." };
}

export async function downloadAllMarks(): Promise<{ success: boolean; message: string; data?: string }> {
    console.log("Downloading all marks requested.");
    await delay(1000);
    // In a real app, fetch data and generate CSV
    const csvData = "StudentID,StudentName,Class,Subject,Exam,Score\nS1001,John Doe,Form 1A,Math,Midterm,85\nS1002,Jane Smith,Form 1A,Math,Midterm,92";
    return { success: true, message: "Marks data prepared for download.", data: csvData };
}

// Placeholder data fetch functions
export async function getTeachers(): Promise<Teacher[]> {
  await delay(100);
  return [
    { id: 't1', name: 'Mr. Harrison', email: 'harrison@example.com', subjectsAssigned: [{classId: 'c1', subjectId: 's1'}] },
    { id: 't2', name: 'Ms. Priya', email: 'priya@example.com', subjectsAssigned: [{classId: 'c1', subjectId: 's2'}, {classId: 'c2', subjectId: 's1'}] },
  ];
}

export async function getStudents(): Promise<Student[]> {
  await delay(100);
  return [
    { id: 'st1', studentIdNumber: 'S1001', firstName: 'Alice', lastName: ' Wonderland', classId: 'c1' },
    { id: 'st2', studentIdNumber: 'S1002', firstName: 'Bob', lastName: 'The Builder', classId: 'c1' },
    { id: 'st3', studentIdNumber: 'S1003', firstName: 'Charlie', lastName: 'Brown', classId: 'c2' },
  ];
}

export async function getClasses(): Promise<ClassInfo[]> {
    await delay(100);
    return [
        { id: 'c1', name: 'Form 1A', level: 'Form 1', stream: 'A', subjects: [{id: 's1', name: 'Mathematics'}, {id: 's2', name: 'English'}], classTeacherId: 't1', teachers:[] },
        { id: 'c2', name: 'Form 1B', level: 'Form 1', stream: 'B', subjects: [{id: 's1', name: 'Mathematics'}, {id: 's3', name: 'Science'}], classTeacherId: 't2', teachers: [] },
    ];
}

export async function getSubjects(): Promise<Subject[]> {
    await delay(100);
    return [
        { id: 's1', name: 'Mathematics', code: 'MATH'},
        { id: 's2', name: 'English', code: 'ENG'},
        { id: 's3', name: 'Science', code: 'SCI'},
        { id: 's4', name: 'History', code: 'HIST'},
    ];
}

export async function getTerms(): Promise<Term[]> {
    await delay(100);
    return [
        { id: 'term1', name: 'Term 1 2024', year: 2024, startDate: '2024-01-15', endDate: '2024-04-15'},
        { id: 'term2', name: 'Term 2 2024', year: 2024, startDate: '2024-05-10', endDate: '2024-08-10'},
    ];
}

export async function getExams(): Promise<Exam[]> {
    await delay(100);
    return [
        { id: 'exam1', name: 'Midterm Exam', termId: 'term1', maxMarks: 100, description: 'Covers first half of syllabus.' },
        { id: 'exam2', name: 'Final Exam', termId: 'term1', maxMarks: 100, description: 'Comprehensive final exam.' },
    ];
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
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
}
