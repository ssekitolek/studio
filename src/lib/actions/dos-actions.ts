
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
    const docRef = await addDoc(collection(db, "teachers"), teacherData);
    const newTeacher: Teacher = { id: docRef.id, ...teacherData };
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher created successfully.", teacher: newTeacher };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create teacher: ${errorMessage}` };
  }
}

export async function updateTeacher(teacherId: string, teacherData: Partial<Teacher>): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating teacher ${teacherId}:`, teacherData);
    const teacherRef = doc(db, "teachers", teacherId);
    await updateDoc(teacherRef, teacherData);
    revalidatePath(`/dos/teachers`);
    revalidatePath(`/dos/teachers/${teacherId}/edit`);
    return { success: true, message: "Teacher updated successfully." };
  } catch (error) {
    console.error(`Error in updateTeacher for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update teacher: ${errorMessage}` };
  }
}

export async function deleteTeacher(teacherId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Deleting teacher:", teacherId);
    await deleteDoc(doc(db, "teachers", teacherId));
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher deleted successfully." };
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
    const docRef = await addDoc(collection(db, "students"), studentData);
    const newStudent: Student = { id: docRef.id, ...studentData };
    revalidatePath("/dos/students");
    return { success: true, message: "Student registered successfully.", student: newStudent };
  } catch (error) {
    console.error("Error in createStudent:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to register student: ${errorMessage}` };
  }
}

export async function updateStudent(studentId: string, studentData: Partial<Student>): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating student ${studentId}:`, studentData);
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, studentData);
    revalidatePath("/dos/students");
    revalidatePath(`/dos/students/${studentId}/edit`);
    return { success: true, message: "Student updated successfully." };
  } catch (error) {
    console.error(`Error in updateStudent for ${studentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update student: ${errorMessage}` };
  }
}

export async function deleteStudent(studentId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Deleting student:", studentId);
    await deleteDoc(doc(db, "students", studentId));
    revalidatePath("/dos/students");
    return { success: true, message: "Student deleted successfully." };
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
    // In Firestore, you might store subject IDs and then fetch/resolve them as needed.
    // For this example, we'll prepare a structure similar to the type, but actual subject objects won't be stored directly in the class document if they are separate entities.
    const { subjectIds, ...restOfClassData } = classData; 
    const classDataToSave = {
      ...restOfClassData,
      subjectReferences: subjectIds.map(id => doc(db, "subjects", id)) // Store references
    };

    const docRef = await addDoc(collection(db, "classes"), classDataToSave);
    
    // For the return value, we'll create a temporary ClassInfo structure.
    // In a real scenario, you might fetch the newly created class or resolve subject names here.
    const tempSubjects: Subject[] = subjectIds.map(id => ({ id, name: `Subject ${id}` })); // Placeholder names
    const newClass: ClassInfo = { ...restOfClassData, id: docRef.id, subjects: tempSubjects };
    
    revalidatePath("/dos/classes");
    return { success: true, message: "Class created successfully.", classInfo: newClass };
  } catch (error) {
    console.error("Error in createClass:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create class: ${errorMessage}` };
  }
}

export async function updateClass(classId: string, classData: Partial<Omit<ClassInfo, 'subjects'>> & { subjectIds?: string[] }): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Updating class ${classId}:`, classData);
    const classRef = doc(db, "classes", classId);
    
    const { subjectIds, ...restOfClassData } = classData;
    let dataToUpdate: any = { ...restOfClassData };

    if (subjectIds) {
      dataToUpdate.subjectReferences = subjectIds.map(id => doc(db, "subjects", id));
    }

    await updateDoc(classRef, dataToUpdate);
    revalidatePath("/dos/classes");
    return { success: true, message: "Class updated successfully." };
  } catch (error) {
    console.error(`Error in updateClass for ${classId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update class: ${errorMessage}` };
  }
}

export async function createSubject(subjectData: Omit<Subject, 'id'>): Promise<{ success: boolean; message: string; subject?: Subject }> {
  try {
    console.log("Creating subject:", subjectData);
    const subjectDataToSave = {
        ...subjectData,
        code: subjectData.code || null, // Store null if code is undefined/empty
    };
    const docRef = await addDoc(collection(db, "subjects"), subjectDataToSave);
    const newSubject: Subject = { id: docRef.id, ...subjectDataToSave, code: subjectDataToSave.code === null ? undefined : subjectDataToSave.code };
    revalidatePath("/dos/classes"); // This page displays subjects
    return { success: true, message: "Subject created successfully.", subject: newSubject };
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
     const docRef = await addDoc(collection(db, "terms"), termData);
    const newTerm: Term = { id: docRef.id, ...termData };
    revalidatePath("/dos/settings/terms");
    return { success: true, message: "Term created successfully.", term: newTerm };
  } catch (error) {
    console.error("Error in createTerm:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create term: ${errorMessage}` };
  }
}

export async function createExam(examData: Omit<Exam, 'id'>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  try {
    console.log("Creating exam:", examData);
    const docRef = await addDoc(collection(db, "exams"), examData);
    const newExam: Exam = { id: docRef.id, ...examData };
    revalidatePath("/dos/settings/exams");
    return { success: true, message: "Exam created successfully.", exam: newExam };
  } catch (error) {
    console.error("Error in createExam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create exam: ${errorMessage}` };
  }
}

export async function updateGeneralSettings(settings: GeneralSettings): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Updating general settings:", settings);
    // In Firestore, general settings are often stored as a single document in a 'settings' collection.
    // Assuming a document ID 'general' for these settings.
    const settingsRef = doc(db, "settings", "general");
    await updateDoc(settingsRef, settings, { merge: true }); // Use merge to avoid overwriting other settings if any
    revalidatePath("/dos/settings/general");
    return { success: true, message: "General settings updated." };
  } catch (error) {
    console.error("Error in updateGeneralSettings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update general settings: ${errorMessage}` };
  }
}

export async function downloadAllMarks(): Promise<{ success: boolean; message: string; data?: string }> {
  try {
    console.log("Downloading all marks requested.");
    // This would involve complex queries across multiple collections (students, marks, assessments, etc.)
    // For now, we keep it as a mock.
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
    return []; // Return empty on error, UI should handle this
  }
}

export async function getStudents(): Promise<Student[]> {
  try {
    const studentsCol = collection(db, "students");
    const studentSnapshot = await getDocs(studentsCol);
    const studentsList = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    return studentsList;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function getClasses(): Promise<ClassInfo[]> {
    try {
        const classesCol = collection(db, "classes");
        const classSnapshot = await getDocs(classesCol);
        const classesListPromises = classSnapshot.docs.map(async (classDoc) => {
            const classData = classDoc.data();
            let subjects: Subject[] = [];
            if (classData.subjectReferences && Array.isArray(classData.subjectReferences)) {
                // This is a simplified approach. In a real app, you might want to fetch subject details
                // or simply store subject names/codes if they don't need full objects here.
                // For now, let's assume subjectReferences contain enough info or are just IDs.
                // If they are DocumentReferences, you would need to getDoc for each.
                // For simplicity, let's map them to basic Subject objects if they are just IDs or simple objects.
                 subjects = await Promise.all(classData.subjectReferences.map(async (ref: any) => {
                    // If ref is a DocumentReference
                    if (ref.path) {
                        // This is a simplified example. Ideally, you'd fetch the actual subject document.
                        // const subjectDoc = await getDoc(ref);
                        // if (subjectDoc.exists()) {
                        //    return { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
                        // }
                        // For now, just return a placeholder if it's a reference path
                        return { id: ref.id || ref.path.split('/').pop(), name: `Subject ${ref.id || ref.path.split('/').pop()}` };
                    }
                    // If ref is already an object with id and name (less likely for references)
                    if (ref.id && ref.name) return ref as Subject;
                    // Fallback for other structures
                    return { id: String(ref), name: `Subject ${String(ref)}`};
                }));
            }
            return { id: classDoc.id, ...classData, subjects } as ClassInfo;
        });
        return Promise.all(classesListPromises);
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
}

export async function getSubjects(): Promise<Subject[]> {
    try {
        const subjectsCol = collection(db, "subjects");
        const subjectSnapshot = await getDocs(subjectsCol);
        const subjectsList = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), code: doc.data().code === null ? undefined : doc.data().code } as Subject));
        return subjectsList;
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
}

export async function getTerms(): Promise<Term[]> {
    try {
        const termsCol = collection(db, "terms");
        const termSnapshot = await getDocs(termsCol);
        const termsList = termSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Term));
        return termsList;
    } catch (error) {
        console.error("Error fetching terms:", error);
        return [];
    }
}

export async function getExams(): Promise<Exam[]> {
    try {
        const examsCol = collection(db, "exams");
        const examSnapshot = await getDocs(examsCol);
        const examsList = examSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        return examsList;
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
    try {
        const settingsDoc = await getDocs(collection(db, "settings")); // Assuming settings are in a 'settings' collection
        if (!settingsDoc.empty && settingsDoc.docs.find(doc => doc.id === "general")) {
            const generalSettingsDoc = settingsDoc.docs.find(doc => doc.id === "general")!;
            return generalSettingsDoc.data() as GeneralSettings;
        }
        // Return default if not found
        return { 
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }], 
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined 
        };
    } catch (error) {
        console.error("Error fetching general settings:", error);
        return { defaultGradingScale: [], markSubmissionTimeZone: 'UTC', currentTermId: undefined };
    }
}
