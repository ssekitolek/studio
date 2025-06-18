
"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings, GradingPolicy, GradingScaleItem, GradeEntry as GenkitGradeEntry, MarkSubmissionFirestoreRecord, AnomalyExplanation } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, where, query, limit, DocumentReference, runTransaction, writeBatch, Timestamp, orderBy, setDoc } from "firebase/firestore";
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
      password: teacherData.password, 
      subjectsAssigned: [], 
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
        password: data.password, 
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
          (assignment: any) => 
            assignment && 
            typeof assignment.classId === 'string' && 
            typeof assignment.subjectId === 'string' &&
            Array.isArray(assignment.examIds) && 
            assignment.examIds.every((id: any) => typeof id === 'string')
        ).map((assignment: any) => ({ 
            classId: assignment.classId, 
            subjectId: assignment.subjectId,
            examIds: assignment.examIds 
        }));
      } else {
        console.warn(`updateTeacher: subjectsAssigned for teacher ${teacherId} was provided but not as a valid array. Ignoring subjectsAssigned update.`);
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
    specificSubjectAssignments: Array<{ classId: string; subjectId: string; examIds: string[] }>;
  }
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  
  console.log(`[DOS Action - updateTeacherAssignments] Teacher ID: ${teacherId}, Received specificSubjectAssignments:`, JSON.stringify(data.specificSubjectAssignments, null, 2));

  const validSpecificAssignments = Array.isArray(data.specificSubjectAssignments)
  ? data.specificSubjectAssignments.filter(
      (assignment) =>
        assignment &&
        typeof assignment.classId === 'string' &&
        assignment.classId.trim() !== '' &&
        typeof assignment.subjectId === 'string' &&
        assignment.subjectId.trim() !== '' &&
        Array.isArray(assignment.examIds) && 
        assignment.examIds.every(id => typeof id === 'string' && id.trim() !== '') && 
        assignment.examIds.length > 0 
    ).map(a => ({ classId: a.classId, subjectId: a.subjectId, examIds: a.examIds }))
  : [];
  
  console.log(`[DOS Action - updateTeacherAssignments] Validated and Mapped specificSubjectAssignments to save:`, JSON.stringify(validSpecificAssignments, null, 2));


  try {
    await runTransaction(db, async (transaction) => {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacherSnap = await transaction.get(teacherRef);
      if (!teacherSnap.exists()) {
        throw new Error(`Teacher with ID ${teacherId} not found.`);
      }

      transaction.update(teacherRef, { subjectsAssigned: validSpecificAssignments });

      const classesQuery = query(collection(db, "classes"));
      const classesSnapshot = await getDocs(classesQuery); 

      classesSnapshot.forEach(classDoc => {
        const classRef = doc(db, "classes", classDoc.id);
        const currentClassTeacher = classDoc.data().classTeacherId;

        if (data.classTeacherForClassIds.includes(classDoc.id)) {
          if (currentClassTeacher !== teacherId) {
            transaction.update(classRef, { classTeacherId: teacherId });
          }
        } else {
          if (currentClassTeacher === teacherId) {
            transaction.update(classRef, { classTeacherId: null });
          }
        }
      });
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
        code: subjectData.code || null, 
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
        code: subjectData.code || null, 
    };
    await updateDoc(subjectRef, dataToUpdate);
    revalidatePath("/dos/classes"); 
    revalidatePath(`/dos/subjects/${subjectId}/edit`); 
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
      examDate: examData.examDate || null, 
      classId: examData.classId || null,
      subjectId: examData.subjectId || null,
      teacherId: examData.teacherId || null,
      marksSubmissionDeadline: examData.marksSubmissionDeadline || null,
    };
    const docRef = await addDoc(collection(db, "exams"), examPayload);
    const newExam: Exam = { 
        id: docRef.id, 
        name: examPayload.name,
        termId: examPayload.termId,
        maxMarks: examPayload.maxMarks,
        description: examPayload.description === null ? undefined : examPayload.description,
        examDate: examPayload.examDate === null ? undefined : examData.examDate, // Corrected
        classId: examPayload.classId === null ? undefined : examData.classId, // Corrected
        subjectId: examPayload.subjectId === null ? undefined : examPayload.subjectId, // Corrected
        teacherId: examPayload.teacherId === null ? undefined : examData.teacherId, // Corrected
        marksSubmissionDeadline: examPayload.marksSubmissionDeadline === null ? undefined : examData.marksSubmissionDeadline, // Corrected
    };
    revalidatePath("/dos/settings/exams");
    return { success: true, message: "Exam created successfully.", exam: newExam };
  } catch (error) {
    console.error("Error in createExam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to create exam: ${errorMessage}` };
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
        examDate: data.examDate === null ? undefined : data.examDate,
        classId: data.classId === null ? undefined : data.classId,
        subjectId: data.subjectId === null ? undefined : data.subjectId,
        teacherId: data.teacherId === null ? undefined : data.teacherId,
        marksSubmissionDeadline: data.marksSubmissionDeadline === null ? undefined : data.marksSubmissionDeadline,
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
    const fieldsToPotentiallyNullify = ['description', 'examDate', 'classId', 'subjectId', 'teacherId', 'marksSubmissionDeadline'];
    fieldsToPotentiallyNullify.forEach(field => {
        if (examPayload.hasOwnProperty(field)) {
            examPayload[field] = examPayload[field] || null;
        }
    });
    
    await updateDoc(examRef, examPayload);
    revalidatePath("/dos/settings/exams");
    revalidatePath(`/dos/settings/exams/${examId}/edit`);
    const updatedExam = await getExamById(examId);
    return { success: true, message: "Exam updated successfully.", exam: updatedExam ?? undefined };
  } catch (error) {
    console.error(`Error updating exam ${examId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update exam: ${errorMessage}` };
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
    revalidatePath("/dos/settings/exams"); 
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
        const policiesRef = collection(db, "gradingPolicies");
        const q = query(policiesRef, where("isDefault", "==", true));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          if (doc.id !== policyId) { 
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
    const settingsToSave: any = { 
        ...settings,
        currentTermId: settings.currentTermId || null,
        globalMarksSubmissionDeadline: settings.globalMarksSubmissionDeadline || null,
        dosGlobalAnnouncementText: settings.dosGlobalAnnouncementText || null,
        dosGlobalAnnouncementType: settings.dosGlobalAnnouncementType || null,
        teacherDashboardResourcesText: settings.teacherDashboardResourcesText || null,
    };
    settingsToSave.defaultGradingScale = Array.isArray(settings.defaultGradingScale) ? settings.defaultGradingScale : [];

    await setDoc(settingsRef, settingsToSave, { merge: true }); 
    revalidatePath("/dos/settings/general");
    revalidatePath("/dos/dashboard"); 
    revalidatePath("/teacher/dashboard"); 
    console.log("[DOS Action - updateGeneralSettings] General settings updated/created successfully in Firestore.");
    return { success: true, message: "General settings updated." };
  } catch (error) {
    console.error("Error in updateGeneralSettings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to update general settings: ${errorMessage}` };
  }
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
      const submission = submissionDoc.data() as MarkSubmissionFirestoreRecord;
      const dateSubmitted = submission.dateSubmitted.toDate().toLocaleDateString();
      
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
export interface MarksForReviewPayload {
    submissionId: string | null; 
    marks: MarksForReviewEntry[];
    dosStatus?: MarkSubmissionFirestoreRecord['dosStatus'];
    dosRejectReason?: string;
}

export async function getMarksForReview(classId: string, subjectId: string, examId: string): Promise<MarksForReviewPayload> {
  const defaultPayload: MarksForReviewPayload = { submissionId: null, marks: [], dosStatus: undefined, dosRejectReason: undefined };
  if (!db) {
    console.error("Firestore is not initialized. Cannot fetch marks for review.");
    return defaultPayload;
  }
  try {
    const assessmentId = `${examId}_${classId}_${subjectId}`;
    console.log(`[DOS Action - getMarksForReview] Fetching marks for assessmentId: ${assessmentId}`);
    const markSubmissionsRef = collection(db, "markSubmissions");
    
    const q = query(
      markSubmissionsRef, 
      where("assessmentId", "==", assessmentId),
      orderBy("dateSubmitted", "desc"), 
      limit(1) 
    );
    const submissionSnapshot = await getDocs(q);

    if (submissionSnapshot.empty) {
      console.log(`[DOS Action - getMarksForReview] No mark submissions found for assessmentId: ${assessmentId}`);
      return defaultPayload; 
    }

    const latestSubmissionDoc = submissionSnapshot.docs[0];
    const submissionData = latestSubmissionDoc.data() as MarkSubmissionFirestoreRecord;

    if (!submissionData.submittedMarks || submissionData.submittedMarks.length === 0) {
      console.log(`[DOS Action - getMarksForReview] Submission found (ID: ${latestSubmissionDoc.id}) but contains no marks for assessmentId: ${assessmentId}`);
      return { ...defaultPayload, submissionId: latestSubmissionDoc.id, dosStatus: submissionData.dosStatus, dosRejectReason: submissionData.dosRejectReason }; 
    }

    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, `${s.firstName} ${s.lastName}`]));

    const marksForReview: MarksForReviewEntry[] = submissionData.submittedMarks.map(mark => ({
      studentId: mark.studentId, 
      grade: mark.score,
      studentName: studentsMap.get(mark.studentId) || "Unknown Student",
    }));
    
    console.log(`[DOS Action - getMarksForReview] Found ${marksForReview.length} marks for assessmentId: ${assessmentId}. Submission ID: ${latestSubmissionDoc.id}`);
    return {
        submissionId: latestSubmissionDoc.id,
        marks: marksForReview,
        dosStatus: submissionData.dosStatus,
        dosRejectReason: submissionData.dosRejectReason
    };

  } catch (error) {
    console.error(`Error fetching marks for review (assessmentId: ${examId}_${classId}_${subjectId}):`, error);
    return defaultPayload; 
  }
}

export async function approveMarkSubmission(submissionId: string): Promise<{ success: boolean, message: string }> {
    if (!db) return { success: false, message: "Firestore not initialized." };
    try {
        const submissionRef = doc(db, "markSubmissions", submissionId);
        await updateDoc(submissionRef, {
            dosStatus: 'Approved',
            dosRejectReason: null, 
            dosLastReviewedAt: Timestamp.now(),
            // dosLastReviewedBy: "D.O.S_ADMIN_ID", // TODO: Replace with actual admin ID if/when auth is added
        });
        revalidatePath("/dos/marks-review");
        
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
            const teacherId = submissionSnap.data().teacherId;
            if (teacherId) {
                const teacherInfo = await getTeacherById(teacherId);
                const teacherNameParam = teacherInfo?.name ? encodeURIComponent(teacherInfo.name) : "Teacher";
                revalidatePath(`/teacher/marks/history?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
                revalidatePath(`/teacher/marks/submit?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
                revalidatePath(`/teacher/dashboard?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
            }
        }
        return { success: true, message: "Submission approved." };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error.";
        return { success: false, message: `Failed to approve submission: ${msg}` };
    }
}

export async function rejectMarkSubmission(submissionId: string, reason: string): Promise<{ success: boolean, message: string }> {
    if (!db) return { success: false, message: "Firestore not initialized." };
    if (!reason || reason.trim() === "") return { success: false, message: "Rejection reason cannot be empty." };
    try {
        const submissionRef = doc(db, "markSubmissions", submissionId);
        await updateDoc(submissionRef, {
            dosStatus: 'Rejected',
            dosRejectReason: reason,
            dosLastReviewedAt: Timestamp.now(),
             // dosLastReviewedBy: "D.O.S_ADMIN_ID", // TODO: Replace with actual admin ID if/when auth is added
        });
        revalidatePath("/dos/marks-review");
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
            const teacherId = submissionSnap.data().teacherId;
             if (teacherId) {
                const teacherInfo = await getTeacherById(teacherId);
                const teacherNameParam = teacherInfo?.name ? encodeURIComponent(teacherInfo.name) : "Teacher";
                revalidatePath(`/teacher/marks/history?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
                revalidatePath(`/teacher/marks/submit?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
                revalidatePath(`/teacher/dashboard?teacherId=${teacherId}&teacherName=${teacherNameParam}`);
            }
        }
        return { success: true, message: "Submission rejected with reason." };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error.";
        return { success: false, message: `Failed to reject submission: ${msg}` };
    }
}

export async function updateSubmittedMarksByDOS(
  submissionId: string,
  updatedMarks: Array<{ studentId: string; score: number }>
): Promise<{ success: boolean; message: string }> {
  if (!db) return { success: false, message: "Firestore not initialized." };
  if (!submissionId) return { success: false, message: "Submission ID is required." };
  
  try {
    const submissionRef = doc(db, "markSubmissions", submissionId);
    const studentCount = updatedMarks.length;
    const totalScore = updatedMarks.reduce((sum, mark) => sum + (mark.score || 0), 0);
    const averageScore = studentCount > 0 ? totalScore / studentCount : null;

    await updateDoc(submissionRef, {
      submittedMarks: updatedMarks,
      studentCount: studentCount,
      averageScore: averageScore,
      dosEdited: true,
      dosLastEditedAt: Timestamp.now(),
      // Note: dosStatus is NOT changed here. D.O.S. must explicitly approve/reject after edits.
    });

    revalidatePath(`/dos/marks-review`);
    // Optionally revalidate teacher history if D.O.S. edits should be immediately visible there.
    // const submissionSnap = await getDoc(submissionRef);
    // if (submissionSnap.exists()) {
    //   const teacherId = submissionSnap.data().teacherId;
    //   if (teacherId) {
    //     revalidatePath(`/teacher/marks/history?teacherId=${teacherId}`);
    //   }
    // }
    return { success: true, message: "Marks updated by D.O.S. successfully." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error.";
    console.error(`Error in updateSubmittedMarksByDOS for ${submissionId}:`, error);
    return { success: false, message: `Failed to update marks: ${msg}` };
  }
}


export async function downloadSingleMarkSubmission(submissionId: string, format: 'csv' | 'xlsx' | 'pdf'): Promise<{ success: boolean; message: string; data?: string | Uint8Array }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  if (!submissionId) {
    return { success: false, message: "Submission ID is required." };
  }

  try {
    const submissionRef = doc(db, "markSubmissions", submissionId);
    const submissionSnap = await getDoc(submissionRef);

    if (!submissionSnap.exists()) {
      return { success: false, message: "Submission not found." };
    }

    const submissionData = submissionSnap.data() as MarkSubmissionFirestoreRecord;
    
    if (!submissionData.submittedMarks || submissionData.submittedMarks.length === 0) {
      return { success: false, message: "No marks found in this submission." };
    }

    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, `${s.firstName} ${s.lastName}`]));
    
    const assessmentParts = submissionData.assessmentName.split(' - ');
    const className = assessmentParts[0] || 'N/A';
    const subjectName = assessmentParts[1] || 'N/A';
    const examName = assessmentParts[2] || 'N/A';
    const dateSubmitted = submissionData.dateSubmitted.toDate().toLocaleDateString();

    const reportData: ReportRow[] = submissionData.submittedMarks.map(mark => ({
      'Student ID': mark.studentId,
      'Student Name': studentsMap.get(mark.studentId) || 'Unknown Student',
      'Class': className,
      'Subject': subjectName,
      'Exam': examName,
      'Score': mark.score,
      'Date Submitted': dateSubmitted,
      'Submitted By (Teacher ID)': submissionData.teacherId,
    }));
    
    const reportTitle = `Marks for ${submissionData.assessmentName} (Submitted ${dateSubmitted})`;

    if (format === 'csv') {
      const header = Object.keys(reportData[0]).join(',');
      const rows = reportData.map(row => 
        Object.values(row).map(value => {
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );
      const csvData = `${reportTitle}\n${header}\n${rows.join('\n')}`;
      return { success: true, message: "CSV data prepared.", data: csvData };
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.sheet_add_aoa(worksheet, [[reportTitle]], { origin: "A1" }); 
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, examName.substring(0,30)); 
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return { success: true, message: "XLSX data prepared.", data: new Uint8Array(excelBuffer) };
    } else if (format === 'pdf') { 
      let pdfTextContent = `${reportTitle}\n`;
      pdfTextContent += "====================================\n\n";
      const header = Object.keys(reportData[0]).map(h => h.padEnd(15)).join('\t|\t');
      pdfTextContent += header + '\n';
      pdfTextContent += "-".repeat(header.length + (Object.keys(reportData[0]).length * 3)) + '\n';

      reportData.forEach(row => {
        pdfTextContent += Object.values(row).map(val => String(val).padEnd(15)).join('\t|\t') + '\n';
      });
      
      pdfTextContent += `\nGenerated by GradeCentral for Submission ID: ${submissionId}`;
      return { success: true, message: "Basic PDF data prepared.", data: pdfTextContent };
    }

    return { success: false, message: "Invalid format selected." };

  } catch (error) {
    console.error(`Error in downloadSingleMarkSubmission for ID ${submissionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to prepare specific submission data: ${errorMessage}` };
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
        password: data.password, 
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
                examDate: data.examDate === null ? undefined : data.examDate,
                classId: data.classId === null ? undefined : data.classId,
                subjectId: data.subjectId === null ? undefined : data.subjectId,
                teacherId: data.teacherId === null ? undefined : data.teacherId,
                marksSubmissionDeadline: data.marksSubmissionDeadline === null ? undefined : data.marksSubmissionDeadline,
            } as Exam;
        });
        return examsList;
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export async function getGeneralSettings(): Promise<GeneralSettings & { isDefaultTemplate?: boolean }> {
  if (!db) {
    console.error("[DOS Action - getGeneralSettings] Firestore is not initialized. Check Firebase configuration. Returning placeholder settings.");
     return {
        defaultGradingScale: [{ grade: 'N/A', minScore: 0, maxScore: 0 }],
        markSubmissionTimeZone: 'UTC',
        currentTermId: undefined,
        globalMarksSubmissionDeadline: undefined,
        dosGlobalAnnouncementText: "Error: System settings could not be loaded. DB uninitialized.",
        dosGlobalAnnouncementType: "warning",
        teacherDashboardResourcesText: "Error: Resources text could not be loaded. DB uninitialized.",
        isDefaultTemplate: true, 
    };
  }
    try {
        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            const defaultGradingScale = Array.isArray(data.defaultGradingScale) ? data.defaultGradingScale : [];
            console.log("[DOS Action - getGeneralSettings] Successfully fetched 'settings/general' document.");
            return {
                currentTermId: data.currentTermId === null ? undefined : data.currentTermId,
                defaultGradingScale,
                markSubmissionTimeZone: data.markSubmissionTimeZone || 'UTC',
                globalMarksSubmissionDeadline: data.globalMarksSubmissionDeadline === null ? undefined : data.globalMarksSubmissionDeadline,
                dosGlobalAnnouncementText: data.dosGlobalAnnouncementText === null ? undefined : data.dosGlobalAnnouncementText,
                dosGlobalAnnouncementType: data.dosGlobalAnnouncementType === null ? undefined : data.dosGlobalAnnouncementType,
                teacherDashboardResourcesText: data.teacherDashboardResourcesText === null ? undefined : data.teacherDashboardResourcesText,
                isDefaultTemplate: false, 
            } as GeneralSettings & { isDefaultTemplate: boolean };
        }
        console.warn("Error: [DOS Action - getGeneralSettings] 'settings/general' document does not exist. Returning default template settings.");
        return {
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }, { grade: 'B', minScore: 70, maxScore: 79 }],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Welcome to GradeCentral! Please configure system settings via the D.O.S. portal.",
            dosGlobalAnnouncementType: "info",
            teacherDashboardResourcesText: "Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. Stay updated with notifications from the D.O.S. and ensure timely submission of grades. If you encounter any issues, please contact the administration.",
            isDefaultTemplate: true,
        };
    } catch (error) {
        console.error("[DOS Action - getGeneralSettings] Error fetching general settings:", error);
        return { 
            defaultGradingScale: [], 
            markSubmissionTimeZone: 'UTC', 
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Error fetching announcements due to a server error.",
            dosGlobalAnnouncementType: "warning",
            teacherDashboardResourcesText: "Could not load teacher resources text due to a server error. Please contact support.",
            isDefaultTemplate: true, 
        };
    }
}
