
"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, where, query, limit } from "firebase/firestore";

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Teacher Management ---
export async function createTeacher(teacherData: Omit<Teacher, 'id'>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    // Check if teacher with the same email already exists
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", teacherData.email), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: `Teacher with email ${teacherData.email} already exists.` };
    }

    const teacherPayload = {
      ...teacherData,
      subjectsAssigned: teacherData.subjectsAssigned || [], 
    };
    const docRef = await addDoc(collection(db, "teachers"), teacherPayload);
    const newTeacher: Teacher = { id: docRef.id, ...teacherPayload };
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher created successfully.", teacher: newTeacher };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create teacher: ${errorMessage}` };
  }
}

export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return null;
  }
  try {
    const teacherRef = doc(db, "teachers", teacherId);
    const teacherSnap = await getDoc(teacherRef);
    if (teacherSnap.exists()) {
      return { id: teacherSnap.id, ...teacherSnap.data() } as Teacher;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching teacher ${teacherId}:`, error);
    return null;
  }
}

export async function updateTeacher(teacherId: string, teacherData: Partial<Omit<Teacher, 'id'>>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const teacherRef = doc(db, "teachers", teacherId);
    await updateDoc(teacherRef, teacherData);
    revalidatePath(`/dos/teachers`);
    revalidatePath(`/dos/teachers/${teacherId}/edit`);
    const updatedTeacher = await getTeacherById(teacherId); 
    return { success: true, message: "Teacher updated successfully.", teacher: updatedTeacher ?? undefined };
  } catch (error) {
    console.error(`Error in updateTeacher for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update teacher: ${errorMessage}` };
  }
}

export async function deleteTeacher(teacherId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    // Optional: Check if student with the same studentIdNumber already exists
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("studentIdNumber", "==", studentData.studentIdNumber), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: `Student with ID Number ${studentData.studentIdNumber} already exists.` };
    }

    const studentPayload: Omit<Student, 'id'> = {
      ...studentData,
      dateOfBirth: studentData.dateOfBirth || undefined, // Ensure optional fields are handled
      gender: studentData.gender || undefined,
    };

    const docRef = await addDoc(collection(db, "students"), studentPayload);
    const newStudent: Student = { id: docRef.id, ...studentPayload };
    revalidatePath("/dos/students");
    return { success: true, message: "Student registered successfully.", student: newStudent };
  } catch (error) {
    console.error("Error in createStudent:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to register student: ${errorMessage}` };
  }
}

export async function updateStudent(studentId: string, studentData: Partial<Student>): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const { subjectIds, ...restOfClassData } = classData;
    const classDataToSave = {
      ...restOfClassData,
      subjectReferences: subjectIds.map(id => doc(db, "subjects", id))
    };

    const docRef = await addDoc(collection(db, "classes"), classDataToSave);

    const subjects: Subject[] = [];
    for (const subjectId of subjectIds) {
        const subjectDocRef = doc(db, "subjects", subjectId);
        const subjectDocSnap = await getDoc(subjectDocRef);
        if (subjectDocSnap.exists()) {
            subjects.push({ id: subjectDocSnap.id, ...subjectDocSnap.data() } as Subject);
        } else {
            subjects.push({ id: subjectId, name: `Unknown Subject (${subjectId})` });
        }
    }
    const newClass: ClassInfo = { ...restOfClassData, id: docRef.id, subjects };

    revalidatePath("/dos/classes");
    return { success: true, message: "Class created successfully.", classInfo: newClass };
  } catch (error) {
    console.error("Error in createClass:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create class: ${errorMessage}` };
  }
}

export async function updateClass(classId: string, classData: Partial<Omit<ClassInfo, 'subjects'>> & { subjectIds?: string[] }): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const subjectDataToSave = {
        ...subjectData,
        code: subjectData.code || null, // Store empty string as null or handle as needed
    };
    const docRef = await addDoc(collection(db, "subjects"), subjectDataToSave);
    // Ensure the returned subject has `code` as undefined if it was stored as null
    const newSubject: Subject = { id: docRef.id, ...subjectDataToSave, code: subjectDataToSave.code === null ? undefined : subjectDataToSave.code };
    revalidatePath("/dos/classes");
    return { success: true, message: "Subject created successfully.", subject: newSubject };
  } catch (error) {
    console.error("Error in createSubject:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create subject: ${errorMessage}` };
  }
}


// --- Term & Exam Management ---
export async function createTerm(termData: Omit<Term, 'id'>): Promise<{ success: boolean; message: string; term?: Term }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const settingsRef = doc(db, "settings", "general");
    // Firestore does not store `undefined` values. Ensure they are handled or converted.
    // For example, delete fields that are undefined if that's the desired behavior.
    // Or ensure Zod schema doesn't produce them for Firestore.
    // For this example, we assume `settings` is already Firestore-compatible.
    await updateDoc(settingsRef, { ...settings }, { merge: true }); // Use spread to avoid passing undefined directly if settings is a class instance.
    revalidatePath("/dos/settings/general");
    return { success: true, message: "General settings updated." };
  } catch (error) {
    console.error("Error in updateGeneralSettings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update general settings: ${errorMessage}` };
  }
}

export async function downloadAllMarks(): Promise<{ success: boolean; message: string; data?: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
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
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
  try {
    const teachersCol = collection(db, "teachers");
    const teacherSnapshot = await getDocs(teachersCol);
    const teachersList = teacherSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        subjectsAssigned: data.subjectsAssigned || [] // Ensure subjectsAssigned defaults to an empty array
      } as Teacher;
    });
    return teachersList;
  } catch (error) {
    console.error("Error fetching teachers from Firestore:", error);
    return [];
  }
}

export async function getStudents(): Promise<Student[]> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
  try {
    const studentsCol = collection(db, "students");
    const studentSnapshot = await getDocs(studentsCol);
    const studentsList = studentSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        studentIdNumber: data.studentIdNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        classId: data.classId,
        dateOfBirth: data.dateOfBirth, // Keep as string or undefined
        gender: data.gender,
       } as Student;
    });
    return studentsList;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function getClasses(): Promise<ClassInfo[]> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
    try {
        const classesCol = collection(db, "classes");
        const classSnapshot = await getDocs(classesCol);
        const classesListPromises = classSnapshot.docs.map(async (classDoc) => {
            const classData = classDoc.data();
            let subjectsArray: Subject[] = [];

            if (classData.subjectReferences && Array.isArray(classData.subjectReferences)) {
                for (const subjectRef of classData.subjectReferences) {
                    // Ensure subjectRef is a DocumentReference-like object with an id
                    if (subjectRef && typeof subjectRef.id === 'string') {
                        try {
                            const subjectDocSnap = await getDoc(doc(db, "subjects", subjectRef.id));
                            if (subjectDocSnap.exists()) {
                                subjectsArray.push({ id: subjectDocSnap.id, ...subjectDocSnap.data() } as Subject);
                            } else {
                                // If subject not found, create a placeholder or skip
                                subjectsArray.push({ id: subjectRef.id, name: `Unknown Subject (${subjectRef.id})` });
                            }
                        } catch (e) {
                             console.error(`Error fetching subject ${subjectRef.id} for class ${classDoc.id}:`, e);
                             subjectsArray.push({ id: subjectRef.id, name: `Error Subject (${subjectRef.id})` }); // Placeholder for errored fetch
                        }
                    }
                }
            }
            return {
                id: classDoc.id,
                name: classData.name || "Unnamed Class",
                level: classData.level || "Unknown Level",
                stream: classData.stream || undefined,
                classTeacherId: classData.classTeacherId || undefined,
                subjects: subjectsArray
            } as ClassInfo;
        });
        return Promise.all(classesListPromises);
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
}

export async function getSubjects(): Promise<Subject[]> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
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
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
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
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return [];
  }
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
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
     return {
        defaultGradingScale: [{ grade: 'N/A', minScore: 0, maxScore: 0 }],
        markSubmissionTimeZone: 'UTC',
        currentTermId: undefined
    };
  }
    try {
        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
             // Ensure defaultGradingScale is an array, even if Firestore returns null/undefined
            const defaultGradingScale = Array.isArray(data.defaultGradingScale) ? data.defaultGradingScale : [];
            return {
                ...data,
                defaultGradingScale,
            } as GeneralSettings;
        }
        // Default settings if nothing is found in Firestore
        return {
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined
        };
    } catch (error) {
        console.error("Error fetching general settings:", error);
        // Return a safe default in case of error
        return { defaultGradingScale: [], markSubmissionTimeZone: 'UTC', currentTermId: undefined };
    }
}
