
"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings, GradingPolicy, GradingScaleItem, GradeEntry as GenkitGradeEntry } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, where, query, limit, DocumentReference, runTransaction, writeBatch, Timestamp, orderBy } from "firebase/firestore";
import * as XLSX from 'xlsx';

// Simulate a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Teacher Management ---
export async function createTeacher(teacherData: Omit<Teacher, 'id' | 'subjectsAssigned'> & { password?: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", teacherData.email), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: `Teacher with email ${teacherData.email} already exists.` };
    }

    const teacherPayload: Omit<Teacher, 'id'> = {
      name: teacherData.name,
      email: teacherData.email,
      password: teacherData.password, // Store password (plain text - insecure for production)
      subjectsAssigned: [], // Initialize with empty array
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
      const data = teacherSnap.data();
      return {
        id: teacherSnap.id,
        name: data.name,
        email: data.email,
        password: data.password, // Include password if it exists
        subjectsAssigned: data.subjectsAssigned || [],
      } as Teacher;
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
    
    const updatePayload: { [key: string]: any } = {};

    if (teacherData.name !== undefined) {
      updatePayload.name = teacherData.name;
    }
    if (teacherData.email !== undefined) {
      updatePayload.email = teacherData.email;
    }
    if (teacherData.password && teacherData.password.trim() !== "") {
      updatePayload.password = teacherData.password;
    }
    if (teacherData.subjectsAssigned !== undefined) {
      if (Array.isArray(teacherData.subjectsAssigned)) {
        updatePayload.subjectsAssigned = teacherData.subjectsAssigned.filter(
          (assignment: any) => assignment && typeof assignment.classId === 'string' && typeof assignment.subjectId === 'string'
        ).map((assignment: any) => ({ classId: assignment.classId, subjectId: assignment.subjectId }));
      } else {
        console.warn(`updateTeacher: subjectsAssigned for teacher ${teacherId} was provided but not as an array. Ignoring subjectsAssigned update.`);
      }
    }


    if (Object.keys(updatePayload).length === 0) {
      const currentTeacher = await getTeacherById(teacherId);
      return { success: true, message: "No changes provided to update teacher.", teacher: currentTeacher ?? undefined };
    }

    await updateDoc(teacherRef, updatePayload);
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

export async function updateTeacherAssignments(
  teacherId: string,
  data: {
    classTeacherForClassIds: string[];
    specificSubjectAssignments: Array<{ classId: string; subjectId: string }>;
  }
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  try {
    // Server-side log to inspect incoming specificSubjectAssignments
    console.log(`[DOS Action - updateTeacherAssignments] Teacher ID: ${teacherId}, Received specificSubjectAssignments:`, JSON.stringify(data.specificSubjectAssignments, null, 2));

    const assignmentsToSave = Array.isArray(data.specificSubjectAssignments) ? data.specificSubjectAssignments : [];

    await runTransaction(db, async (transaction) => {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacherSnap = await transaction.get(teacherRef);
      if (!teacherSnap.exists()) {
        throw new Error(`Teacher with ID ${teacherId} not found.`);
      }

      // 1. Update teacher's specific subject assignments
      transaction.update(teacherRef, { subjectsAssigned: assignmentsToSave });

      // 2. Handle class teacher assignments
      const classesCol = collection(db, "classes");
      // No need to await getDocs here if we iterate classTeacherForClassIds and then unassign others.
      // This approach is more efficient:
      
      // Get all classes to find previously assigned ones
      const allPreviouslyAssignedClassesToThisTeacherQuery = query(classesCol, where("classTeacherId", "==", teacherId));
      const previouslyAssignedSnapshot = await transaction.get(allPreviouslyAssignedClassesToThisTeacherQuery);
      
      // Unassign from classes not in the new list
      for (const classDoc of previouslyAssignedSnapshot.docs) {
        if (!data.classTeacherForClassIds.includes(classDoc.id)) {
          transaction.update(classDoc.ref, { classTeacherId: null });
        }
      }
      
      // Assign to classes in the new list
      for (const classId of data.classTeacherForClassIds) {
        const classRef = doc(db, "classes", classId);
        // We could get the doc to check current classTeacherId, but simply setting it is often fine.
        // If another teacher was classTeacher, this overwrites it, which is intended.
        transaction.update(classRef, { classTeacherId: teacherId });
      }
    });

    revalidatePath("/dos/teachers/assignments");
    revalidatePath("/dos/teachers");
    revalidatePath("/dos/classes");
    return { success: true, message: "Teacher assignments updated successfully." };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("Error in updateTeacherAssignments:", error);
    return { success: false, message: `Failed to update assignments: ${errorMessage}` };
  }
}


// --- Student Management ---
export async function createStudent(studentData: Omit<Student, 'id'>): Promise<{ success: boolean; message: string; student?: Student }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("studentIdNumber", "==", studentData.studentIdNumber), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: `Student with ID Number ${studentData.studentIdNumber} already exists.` };
    }

    const studentPayload: Omit<Student, 'id'> = {
      ...studentData,
      dateOfBirth: studentData.dateOfBirth || undefined,
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

export async function getStudentById(studentId: string): Promise<Student | null> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return null;
  }
  try {
    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      return {
        id: studentSnap.id,
        ...data,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth : undefined,
        gender: data.gender ? data.gender : undefined,
       } as Student;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching student ${studentId}:`, error);
    return null;
  }
}


export async function updateStudent(studentId: string, studentData: Partial<Omit<Student, 'id'>>): Promise<{ success: boolean; message: string, student?: Student }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const studentRef = doc(db, "students", studentId);
    const dataToUpdate = {
      ...studentData,
      dateOfBirth: studentData.dateOfBirth || null,
      gender: studentData.gender || null,
    };
    await updateDoc(studentRef, dataToUpdate);
    revalidatePath("/dos/students");
    revalidatePath(`/dos/students/${studentId}/edit`);
    const updatedStudent = await getStudentById(studentId);
    return { success: true, message: "Student updated successfully.", student: updatedStudent ?? undefined };
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
export async function createClass(
  classData: Omit<ClassInfo, 'id' | 'subjects'> & { subjectIds: string[] }
): Promise<{ success: boolean; message: string; classInfo?: ClassInfo }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const { subjectIds, ...restOfClassData } = classData;

    const subjectReferences: DocumentReference[] = subjectIds.map(id => doc(db, "subjects", id));

    const classDataToSave = {
      ...restOfClassData,
      classTeacherId: restOfClassData.classTeacherId || null,
      stream: restOfClassData.stream || null,
      subjectReferences: subjectReferences
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
    const newClass: ClassInfo = {
        ...restOfClassData,
        id: docRef.id,
        subjects,
        stream: classDataToSave.stream === null ? undefined : classDataToSave.stream,
        classTeacherId: classDataToSave.classTeacherId === null ? undefined : classDataToSave.classTeacherId,
    };

    revalidatePath("/dos/classes");
    return { success: true, message: "Class created successfully.", classInfo: newClass };
  } catch (error) {
    console.error("Error in createClass:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create class: ${errorMessage}` };
  }
}

export async function getClassById(classId: string): Promise<ClassInfo | null> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return null;
  }
  try {
    const classRef = doc(db, "classes", classId);
    const classSnap = await getDoc(classRef);

    if (!classSnap.exists()) {
      return null;
    }

    const classData = classSnap.data();
    let subjectsArray: Subject[] = [];

    if (classData.subjectReferences && Array.isArray(classData.subjectReferences)) {
      for (const subjectRef of classData.subjectReferences) {
        if (subjectRef && typeof subjectRef.id === 'string') {
          try {
            const subjectDocSnap = await getDoc(doc(db, "subjects", subjectRef.id));
            if (subjectDocSnap.exists()) {
              const subjData = subjectDocSnap.data();
              subjectsArray.push({
                id: subjectDocSnap.id,
                name: subjData.name,
                code: subjData.code === null ? undefined : subjData.code
              } as Subject);
            } else {
              subjectsArray.push({ id: subjectRef.id, name: `Unknown Subject (${subjectRef.id})` });
            }
          } catch (e) {
            console.error(`Error fetching subject ${subjectRef.id} for class ${classSnap.id}:`, e);
            subjectsArray.push({ id: subjectRef.id, name: `Error Subject (${subjectRef.id})` });
          }
        }
      }
    }
    return {
      id: classSnap.id,
      name: classData.name || "Unnamed Class",
      level: classData.level || "Unknown Level",
      stream: classData.stream === null ? undefined : classData.stream,
      classTeacherId: classData.classTeacherId === null ? undefined : classData.classTeacherId,
      subjects: subjectsArray
    } as ClassInfo;
  } catch (error) {
    console.error(`Error fetching class ${classId}:`, error);
    return null;
  }
}


export async function updateClass(classId: string, classData: Partial<Omit<ClassInfo, 'id' | 'subjects'>> & { subjectIds?: string[] }): Promise<{ success: boolean; message: string }> {
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
    dataToUpdate.classTeacherId = dataToUpdate.classTeacherId || null;
    dataToUpdate.stream = dataToUpdate.stream || null;


    await updateDoc(classRef, dataToUpdate);
    revalidatePath("/dos/classes");
    revalidatePath(`/dos/classes/${classId}/edit`);
    return { success: true, message: "Class updated successfully." };
  } catch (error)
{
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
        code: subjectData.code || null, // Ensure code is null if undefined/empty for Firestore
    };
    const docRef = await addDoc(collection(db, "subjects"), subjectDataToSave);
    const newSubject: Subject = { id: docRef.id, ...subjectDataToSave, code: subjectDataToSave.code === null ? undefined : subjectDataToSave.code };
    revalidatePath("/dos/classes");
    return { success: true, message: "Subject created successfully.", subject: newSubject };
  } catch (error) {
    console.error("Error in createSubject:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create subject: ${errorMessage}` };
  }
}

export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return null;
  }
  try {
    const subjectRef = doc(db, "subjects", subjectId);
    const subjectSnap = await getDoc(subjectRef);
    if (subjectSnap.exists()) {
      const data = subjectSnap.data();
      return {
        id: subjectSnap.id,
        name: data.name,
        code: data.code === null ? undefined : data.code,
      } as Subject;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching subject ${subjectId}:`, error);
    return null;
  }
}

export async function updateSubject(subjectId: string, subjectData: Partial<Omit<Subject, 'id'>>): Promise<{ success: boolean; message: string; subject?: Subject }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const subjectRef = doc(db, "subjects", subjectId);
    const dataToUpdate = {
        ...subjectData,
        code: subjectData.code || null, // Ensure code is null if undefined/empty for Firestore
    };
    await updateDoc(subjectRef, dataToUpdate);
    revalidatePath("/dos/classes"); // Revalidate page listing subjects
    revalidatePath(`/dos/subjects/${subjectId}/edit`); // Revalidate this specific edit page
    const updatedSubject = await getSubjectById(subjectId);
    return { success: true, message: "Subject updated successfully.", subject: updatedSubject ?? undefined };
  } catch (error) {
    console.error(`Error in updateSubject for ${subjectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update subject: ${errorMessage}` };
  }
}


// --- Term & Exam Management ---
export async function createTerm(termData: Omit<Term, 'id'>): Promise<{ success: boolean; message: string; term?: Term }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const termPayload = {
      ...termData,
      year: Number(termData.year),
    };
    const docRef = await addDoc(collection(db, "terms"), termPayload);
    const newTerm: Term = { id: docRef.id, ...termPayload };
    revalidatePath("/dos/settings/terms");
    return { success: true, message: "Term created successfully.", term: newTerm };
  } catch (error) {
    console.error("Error in createTerm:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create term: ${errorMessage}` };
  }
}

export async function updateTerm(termId: string, termData: Partial<Omit<Term, 'id'>>): Promise<{ success: boolean; message: string; term?: Term }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const termRef = doc(db, "terms", termId);
    const termPayload:any = { ...termData };
    if (termPayload.year && typeof termPayload.year !== 'number') {
        termPayload.year = Number(termPayload.year);
    }
    await updateDoc(termRef, termPayload);
    revalidatePath("/dos/settings/terms");
    revalidatePath(`/dos/settings/terms/${termId}/edit`);
    const updatedTerm = await getTermById(termId);
    return { success: true, message: "Term updated successfully.", term: updatedTerm ?? undefined };
  } catch (error) {
    console.error(`Error updating term ${termId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update term: ${errorMessage}` };
  }
}

export async function getTermById(termId: string): Promise<Term | null> {
    if (!db) return null;
    try {
        const termRef = doc(db, "terms", termId);
        const termSnap = await getDoc(termRef);
        if (termSnap.exists()) {
            const data = termSnap.data();
            return {
                id: termSnap.id,
                name: data.name,
                year: data.year,
                startDate: data.startDate, 
                endDate: data.endDate,     
            } as Term;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching term ${termId}:`, error);
        return null;
    }
}


export async function createExam(examData: Omit<Exam, 'id'>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const examPayload = {
      ...examData,
      maxMarks: Number(examData.maxMarks), 
      description: examData.description || null,
      date: examData.date || null, 
    };
    const docRef = await addDoc(collection(db, "exams"), examPayload);
    const newExam: Exam = { 
        id: docRef.id, 
        name: examPayload.name,
        termId: examPayload.termId,
        maxMarks: examPayload.maxMarks,
        description: examPayload.description === null ? undefined : examPayload.description,
        date: examPayload.date === null ? undefined : examPayload.date,
    };
    revalidatePath("/dos/settings/exams");
    return { success: true, message: "Exam type created successfully.", exam: newExam };
  } catch (error) {
    console.error("Error in createExam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create exam type: ${errorMessage}` };
  }
}

export async function getExamById(examId: string): Promise<Exam | null> {
  if (!db) {
    console.error("Firestore is not initialized. Check Firebase configuration.");
    return null;
  }
  try {
    const examRef = doc(db, "exams", examId);
    const examSnap = await getDoc(examRef);
    if (examSnap.exists()) {
      const data = examSnap.data();
      return {
        id: examSnap.id,
        name: data.name,
        termId: data.termId,
        maxMarks: data.maxMarks,
        description: data.description === null ? undefined : data.description,
        date: data.date === null ? undefined : data.date,
      } as Exam;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching exam ${examId}:`, error);
    return null;
  }
}

export async function updateExam(examId: string, examData: Partial<Omit<Exam, 'id'>>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const examRef = doc(db, "exams", examId);
    const examPayload: any = { ...examData };

    if (examPayload.maxMarks !== undefined) {
      examPayload.maxMarks = Number(examPayload.maxMarks);
    }
    if (examPayload.hasOwnProperty('description')) {
        examPayload.description = examPayload.description || null;
    }
    if (examPayload.hasOwnProperty('date')) {
        examPayload.date = examPayload.date || null;
    }
    
    await updateDoc(examRef, examPayload);
    revalidatePath("/dos/settings/exams");
    revalidatePath(`/dos/settings/exams/${examId}/edit`);
    const updatedExam = await getExamById(examId);
    return { success: true, message: "Exam type updated successfully.", exam: updatedExam ?? undefined };
  } catch (error) {
    console.error(`Error updating exam ${examId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update exam type: ${errorMessage}` };
  }
}


// --- Grading Policy Management ---
export async function createGradingPolicy(policyData: Omit<GradingPolicy, 'id'>): Promise<{ success: boolean; message: string; policy?: GradingPolicy }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const policyPayload = { ...policyData };

    if (policyPayload.isDefault) {
      // If setting this as default, unset other defaults
      const policiesRef = collection(db, "gradingPolicies");
      const q = query(policiesRef, where("isDefault", "==", true));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const docRef = await addDoc(collection(db, "gradingPolicies"), policyPayload);
    const newPolicy: GradingPolicy = { id: docRef.id, ...policyPayload };
    revalidatePath("/dos/settings/exams"); // This page displays grading policies
    return { success: true, message: "Grading policy created successfully.", policy: newPolicy };
  } catch (error) {
    console.error("Error in createGradingPolicy:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create grading policy: ${errorMessage}` };
  }
}

export async function updateGradingPolicy(policyId: string, policyData: Omit<GradingPolicy, 'id'>): Promise<{ success: boolean; message: string; policy?: GradingPolicy }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const policyRef = doc(db, "gradingPolicies", policyId);
    const policyPayload = { ...policyData };

    if (policyPayload.isDefault) {
        // If setting this as default, unset other defaults
        const policiesRef = collection(db, "gradingPolicies");
        const q = query(policiesRef, where("isDefault", "==", true));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          if (doc.id !== policyId) { // Don't unset the current one if it's already default
            batch.update(doc.ref, { isDefault: false });
          }
        });
        await batch.commit();
    }
    
    await updateDoc(policyRef, policyPayload);
    revalidatePath("/dos/settings/exams");
    revalidatePath(`/dos/settings/grading/${policyId}/edit`);
    const updatedPolicyDoc = await getDoc(policyRef);
    const updatedPolicy = { id: updatedPolicyDoc.id, ...updatedPolicyDoc.data() } as GradingPolicy;
    return { success: true, message: "Grading policy updated successfully.", policy: updatedPolicy };

  } catch (error) {
    console.error(`Error in updateGradingPolicy for ${policyId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update grading policy: ${errorMessage}` };
  }
}

export async function getGradingPolicyById(policyId: string): Promise<GradingPolicy | null> {
  if (!db) return null;
  try {
    const policyRef = doc(db, "gradingPolicies", policyId);
    const policySnap = await getDoc(policyRef);
    if (policySnap.exists()) {
      return { id: policySnap.id, ...policySnap.data() } as GradingPolicy;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching grading policy ${policyId}:`, error);
    return null;
  }
}

export async function getGradingPolicies(): Promise<GradingPolicy[]> {
  if (!db) {
    console.error("Firestore is not initialized.");
    return [];
  }
  try {
    const policiesCol = collection(db, "gradingPolicies");
    const policySnapshot = await getDocs(policiesCol);
    const policiesList = policySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradingPolicy));
    return policiesList;
  } catch (error) {
    console.error("Error fetching grading policies:", error);
    return [];
  }
}


export async function updateGeneralSettings(settings: GeneralSettings): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const settingsRef = doc(db, "settings", "general");
    const settingsToSave = {
        ...settings,
        currentTermId: settings.currentTermId || null,
        globalMarksSubmissionDeadline: settings.globalMarksSubmissionDeadline || null,
        dosGlobalAnnouncementText: settings.dosGlobalAnnouncementText || null,
        dosGlobalAnnouncementType: settings.dosGlobalAnnouncementType || null,
        teacherDashboardResourcesText: settings.teacherDashboardResourcesText || null, // Save new field
    };
    await updateDoc(settingsRef, settingsToSave, { merge: true }); 
    revalidatePath("/dos/settings/general");
    revalidatePath("/dos/dashboard"); 
    revalidatePath("/teacher/dashboard"); // Revalidate teacher dashboard for announcements and resources text
    return { success: true, message: "General settings updated." };
  } catch (error) {
    console.error("Error in updateGeneralSettings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update general settings: ${errorMessage}` };
  }
}

interface MarkSubmissionRecord {
  teacherId: string;
  assessmentId: string;
  assessmentName: string;
  dateSubmitted: Timestamp;
  studentCount: number;
  averageScore: number | null;
  status: string;
  submittedMarks: Array<{ studentId: string; score: number }>; // studentId is studentIdNumber
  anomalyExplanations: Array<any>; // Consider defining a type for anomaly explanations
}

interface ReportRow {
  'Student ID': string;
  'Student Name': string;
  'Class': string;
  'Subject': string;
  'Exam': string;
  'Score': number | string;
  'Date Submitted': string;
  'Submitted By (Teacher ID)': string;
}


async function getAllSubmittedMarksData(): Promise<ReportRow[]> {
  if (!db) {
    console.error("Firestore is not initialized for report generation.");
    return [];
  }
  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    const submissionsSnapshot = await getDocs(markSubmissionsRef);

    if (submissionsSnapshot.empty) {
      return [];
    }

    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, `${s.firstName} ${s.lastName}`]));

    const reportRows: ReportRow[] = [];

    for (const submissionDoc of submissionsSnapshot.docs) {
      const submission = submissionDoc.data() as MarkSubmissionRecord;
      const dateSubmitted = submission.dateSubmitted.toDate().toLocaleDateString();
      
      // Basic parsing of assessmentName, assuming "ClassName - SubjectName - ExamName"
      const assessmentParts = submission.assessmentName.split(' - ');
      const className = assessmentParts[0] || 'N/A';
      const subjectName = assessmentParts[1] || 'N/A';
      const examName = assessmentParts[2] || 'N/A';

      submission.submittedMarks.forEach(mark => {
        reportRows.push({
          'Student ID': mark.studentId,
          'Student Name': studentsMap.get(mark.studentId) || 'Unknown Student',
          'Class': className,
          'Subject': subjectName,
          'Exam': examName,
          'Score': mark.score,
          'Date Submitted': dateSubmitted,
          'Submitted By (Teacher ID)': submission.teacherId,
        });
      });
    }
    return reportRows;
  } catch (error) {
    console.error("Error fetching all submitted marks data for report:", error);
    return [];
  }
}

export async function downloadAllMarks(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<{ success: boolean; message: string; data?: string | Uint8Array }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const reportData = await getAllSubmittedMarksData();

    if (reportData.length === 0) {
      return { success: false, message: "No marks data found to generate a report." };
    }

    if (format === 'csv') {
      const header = Object.keys(reportData[0]).join(',');
      const rows = reportData.map(row => 
        Object.values(row).map(value => {
          const stringValue = String(value);
          // Escape commas and quotes for CSV
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );
      const csvData = `${header}\n${rows.join('\n')}`;
      return { success: true, message: "CSV data prepared.", data: csvData };
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Marks Report");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return { success: true, message: "XLSX data prepared.", data: new Uint8Array(excelBuffer) };
    } else if (format === 'pdf') {
      // Basic text-based PDF content
      let pdfTextContent = "Marks Report\n";
      pdfTextContent += "====================================\n\n";
      const header = Object.keys(reportData[0]).join('\t|\t');
      pdfTextContent += header + '\n';
      pdfTextContent += "-".repeat(header.length * 1.5) + '\n';

      reportData.forEach(row => {
        pdfTextContent += Object.values(row).map(val => String(val).padEnd(15)).join('\t|\t') + '\n';
      });
      
      pdfTextContent += "\nGenerated by GradeCentral";
      return { success: true, message: "Basic PDF data prepared.", data: pdfTextContent };
    }

    return { success: false, message: "Invalid format selected." };

  } catch (error) {
    console.error("Error in downloadAllMarks:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to prepare marks data: ${errorMessage}` };
  }
}

export type MarksForReviewEntry = GenkitGradeEntry & { studentName: string };

export async function getMarksForReview(classId: string, subjectId: string, examId: string): Promise<MarksForReviewEntry[]> {
  if (!db) {
    console.error("Firestore is not initialized. Cannot fetch marks for review.");
    return [];
  }
  try {
    const assessmentId = `${examId}_${classId}_${subjectId}`;
    const markSubmissionsRef = collection(db, "markSubmissions");
    
    const q = query(
      markSubmissionsRef, 
      where("assessmentId", "==", assessmentId),
      orderBy("dateSubmitted", "desc"), // Get the latest submission first
      limit(1) // We only want the most recent submission for this specific assessment
    );
    const submissionSnapshot = await getDocs(q);

    if (submissionSnapshot.empty) {
      console.log(`No mark submissions found for assessmentId: ${assessmentId}`);
      return []; // No submissions found for these criteria
    }

    const latestSubmissionDoc = submissionSnapshot.docs[0];
    const submissionData = latestSubmissionDoc.data() as MarkSubmissionRecord;

    if (!submissionData.submittedMarks || submissionData.submittedMarks.length === 0) {
      return []; // Submission exists but has no marks
    }

    // Fetch all students to map names
    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, `${s.firstName} ${s.lastName}`]));

    const marksForReview: MarksForReviewEntry[] = submissionData.submittedMarks.map(mark => ({
      studentId: mark.studentId, // This is studentIdNumber
      grade: mark.score,
      studentName: studentsMap.get(mark.studentId) || "Unknown Student",
    }));
    
    return marksForReview;

  } catch (error) {
    console.error(`Error fetching marks for review (assessmentId: ${examId}_${classId}_${subjectId}):`, error);
    return []; // Return empty array on error
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
    const teachersList = teacherSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        email: data.email,
        password: data.password, // Include password if it exists
        subjectsAssigned: data.subjectsAssigned || []
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
        dateOfBirth: data.dateOfBirth,
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
                    if (subjectRef && typeof subjectRef.id === 'string') {
                        try {
                            const subjectDocSnap = await getDoc(doc(db, "subjects", subjectRef.id));
                            if (subjectDocSnap.exists()) {
                                const subjData = subjectDocSnap.data();
                                subjectsArray.push({
                                    id: subjectDocSnap.id,
                                    name: subjData.name,
                                    code: subjData.code === null ? undefined : subjData.code
                                } as Subject);
                            } else {
                                subjectsArray.push({ id: subjectRef.id, name: `Unknown Subject (${subjectRef.id})` });
                            }
                        } catch (e) {
                             console.error(`Error fetching subject ${subjectRef.id} for class ${classDoc.id}:`, e);
                             subjectsArray.push({ id: subjectRef.id, name: `Error Subject (${subjectRef.id})` });
                        }
                    }
                }
            }
            return {
                id: classDoc.id,
                name: classData.name || "Unnamed Class",
                level: classData.level || "Unknown Level",
                stream: classData.stream === null ? undefined : classData.stream,
                classTeacherId: classData.classTeacherId === null ? undefined : classData.classTeacherId,
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
        const examsList = examSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name,
                termId: data.termId,
                maxMarks: data.maxMarks,
                description: data.description === null ? undefined : data.description,
                date: data.date === null ? undefined : data.date,
            } as Exam;
        });
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
        currentTermId: undefined,
        globalMarksSubmissionDeadline: undefined,
        dosGlobalAnnouncementText: undefined,
        dosGlobalAnnouncementType: undefined,
        teacherDashboardResourcesText: undefined, // Default for new field
    };
  }
    try {
        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            const defaultGradingScale = Array.isArray(data.defaultGradingScale) ? data.defaultGradingScale : [];
            return {
                currentTermId: data.currentTermId === null ? undefined : data.currentTermId,
                defaultGradingScale,
                markSubmissionTimeZone: data.markSubmissionTimeZone || 'UTC',
                globalMarksSubmissionDeadline: data.globalMarksSubmissionDeadline === null ? undefined : data.globalMarksSubmissionDeadline,
                dosGlobalAnnouncementText: data.dosGlobalAnnouncementText === null ? undefined : data.dosGlobalAnnouncementText,
                dosGlobalAnnouncementType: data.dosGlobalAnnouncementType === null ? undefined : data.dosGlobalAnnouncementType,
                teacherDashboardResourcesText: data.teacherDashboardResourcesText === null ? undefined : data.teacherDashboardResourcesText, // Fetch new field
            } as GeneralSettings;
        }
        // Default values if 'general' settings document doesn't exist
        return {
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }, { grade: 'B', minScore: 70, maxScore: 79 }],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Welcome to GradeCentral! Please ensure all marks are submitted on time.",
            dosGlobalAnnouncementType: "info",
            teacherDashboardResourcesText: "Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. Stay updated with notifications from the D.O.S. and ensure timely submission of grades. If you encounter any issues, please contact the administration.", // Default for new field
        };
    } catch (error) {
        console.error("Error fetching general settings:", error);
        return { 
            defaultGradingScale: [], 
            markSubmissionTimeZone: 'UTC', 
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Error fetching announcements.",
            dosGlobalAnnouncementType: "warning",
            teacherDashboardResourcesText: "Could not load teacher resources text. Please contact support.", // Error state for new field
        };
    }
}


    