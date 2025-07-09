
"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings, GradingPolicy, GradingScaleItem, GradeEntry as GenkitGradeEntry, MarkSubmissionFirestoreRecord, AnomalyExplanation, MarksForReviewPayload, MarksForReviewEntry, AssessmentAnalysisData } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, where, query, limit, DocumentReference, runTransaction, writeBatch, Timestamp, orderBy, setDoc } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { adminAuth } from '@/lib/firebase-admin';


// --- Teacher Management ---
export async function createTeacher(teacherData: Omit<Teacher, 'id' | 'subjectsAssigned' | 'uid'> & { password?: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  if (!teacherData.password || teacherData.password.length < 6) {
    return { success: false, message: "Password is required and must be at least 6 characters."};
  }
  try {
    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: teacherData.email,
      password: teacherData.password,
      displayName: teacherData.name,
      emailVerified: true, // Assuming D.O.S. is creating trusted users
    });

    // 2. Create teacher document in Firestore with the Auth UID
    const teacherPayload: Omit<Teacher, 'id' | 'password'> = {
      uid: userRecord.uid,
      name: teacherData.name,
      email: teacherData.email,
      subjectsAssigned: [], // Initialize with empty array
    };
    
    // We explicitly set the document ID to be the same as the Auth UID for easy lookup
    const teacherRef = doc(db, "teachers", userRecord.uid);
    await setDoc(teacherRef, teacherPayload);

    const newTeacher: Teacher = { id: userRecord.uid, ...teacherPayload };
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher created successfully in Auth and Firestore.", teacher: newTeacher };
  } catch (error: any) {
    console.error("Error in createTeacher:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error.code === 'auth/email-already-exists') {
        errorMessage = `An account with email ${teacherData.email} already exists in Firebase Authentication.`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
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
        uid: data.uid,
        name: data.name,
        email: data.email,
        subjectsAssigned: data.subjectsAssigned || [],
      } as Teacher;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching teacher ${teacherId}:`, error);
    return null;
  }
}

export async function updateTeacher(teacherId: string, teacherData: Partial<Omit<Teacher, 'id' | 'subjectsAssigned'>>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const teacherRef = doc(db, "teachers", teacherId);
    
    // Update Firestore document
    const firestoreUpdatePayload: { [key: string]: any } = {};
    if (teacherData.name !== undefined) firestoreUpdatePayload.name = teacherData.name;
    if (teacherData.email !== undefined) firestoreUpdatePayload.email = teacherData.email;
    
    if(Object.keys(firestoreUpdatePayload).length > 0) {
        await updateDoc(teacherRef, firestoreUpdatePayload);
    }

    // Update Firebase Auth user
    const authUpdatePayload: { displayName?: string; email?: string; password?: string } = {};
    if (teacherData.name) authUpdatePayload.displayName = teacherData.name;
    if (teacherData.email) authUpdatePayload.email = teacherData.email;
    if (teacherData.password) authUpdatePayload.password = teacherData.password;
    
    if(Object.keys(authUpdatePayload).length > 0) {
        await adminAuth.updateUser(teacherId, authUpdatePayload);
    }
    
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
    const batch = writeBatch(db);

    // Unassign as class teacher
    const classesQuery = query(collection(db, "classes"), where("classTeacherId", "==", teacherId));
    const classesSnapshot = await getDocs(classesQuery);
    classesSnapshot.forEach(classDoc => {
      batch.update(classDoc.ref, { classTeacherId: null });
    });

    // Delete Firestore document
    const teacherRef = doc(db, "teachers", teacherId);
    batch.delete(teacherRef);

    await batch.commit();

    // Delete from Firebase Auth
    await adminAuth.deleteUser(teacherId);

    revalidatePath("/dos/teachers");
    revalidatePath("/dos/classes");
    return { success: true, message: "Teacher deleted successfully from Auth and Firestore." };
  } catch (error) {
    console.error(`Error in deleteTeacher for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete teacher: ${errorMessage}` };
  }
}

export async function updateTeacherAssignments(
  teacherId: string, // This is the Auth UID and Firestore Doc ID
  data: {
    classTeacherForClassIds: string[];
    specificSubjectAssignments: Array<{ classId: string; subjectId: string; examIds: string[] }>;
  }
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }

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

  try {
    await runTransaction(db, async (transaction) => {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacherSnap = await transaction.get(teacherRef);
      if (!teacherSnap.exists()) {
        throw new Error(`Teacher with ID ${teacherId} not found.`);
      }

      transaction.update(teacherRef, { subjectsAssigned: validSpecificAssignments });
      
      const teacherDoc = await getTeacherById(teacherId);

      const classesQuery = query(collection(db, "classes"));
      const classesSnapshot = await getDocs(classesQuery);

      classesSnapshot.forEach(classDoc => {
        const classRef = doc(db, "classes", classDoc.id);
        const currentClassTeacherId = classDoc.data().classTeacherId;

        // If this class is in the list to be assigned to the current teacher
        if (data.classTeacherForClassIds.includes(classDoc.id)) {
          // And it's not already assigned to them, update it.
          if (currentClassTeacherId !== teacherDoc?.id) {
            transaction.update(classRef, { classTeacherId: teacherDoc?.id });
          }
        } else { // If this class is NOT in the list
          // And it IS currently assigned to this teacher, unassign it.
          if (currentClassTeacherId === teacherDoc?.id) {
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
      stream: studentData.stream || undefined,
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

export async function bulkImportStudents(
  studentsData: Array<{ studentIdNumber: string; firstName: string; lastName: string }>,
  classId: string,
  stream?: string
): Promise<{ success: boolean; successCount: number; errorCount: number; errors: string[] }> {
  if (!db) {
    return { success: false, successCount: 0, errorCount: studentsData.length, errors: ["Firestore is not initialized."] };
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const studentIdNumbersInFile = new Set<string>();

  try {
    const existingStudentsSnapshot = await getDocs(collection(db, "students"));
    const existingStudentIdNumbers = new Set(existingStudentsSnapshot.docs.map(d => d.data().studentIdNumber));
    const batch = writeBatch(db);

    studentsData.forEach((student, index) => {
      const studentIdNumber = String(student.studentIdNumber || "").trim();
      const firstName = String(student.firstName || "").trim();
      const lastName = String(student.lastName || "").trim();
      const rowNum = index + 2; // Assuming row 1 is header

      if (!studentIdNumber || !firstName || !lastName) {
        errors.push(`Row ${rowNum}: Missing required data (studentIdNumber, firstName, or lastName).`);
        errorCount++;
        return;
      }

      if (existingStudentIdNumbers.has(studentIdNumber)) {
        errors.push(`Row ${rowNum}: Student ID "${studentIdNumber}" already exists in the system.`);
        errorCount++;
        return;
      }
      
      if (studentIdNumbersInFile.has(studentIdNumber)) {
        errors.push(`Row ${rowNum}: Student ID "${studentIdNumber}" is duplicated in the file.`);
        errorCount++;
        return;
      }

      const studentRef = doc(collection(db, "students"));
      const studentPayload: Partial<Student> = {
        studentIdNumber,
        firstName,
        lastName,
        classId,
      };
      if (stream) {
        studentPayload.stream = stream;
      }
      batch.set(studentRef, studentPayload);
      studentIdNumbersInFile.add(studentIdNumber);
      successCount++;
    });

    if (successCount > 0) {
      await batch.commit();
    }

    revalidatePath("/dos/students");
    revalidatePath(`/dos/classes/${classId}/edit`);

    return { success: true, successCount, errorCount, errors };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during bulk import.";
    return { success: false, successCount: 0, errorCount: studentsData.length, errors: [errorMessage] };
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
      stream: studentData.stream || null,
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
    // TODO: Implement dependency checks before deleting a student.
    // E.g., check if student has marks in markSubmissions. For now, direct delete.
    console.warn(`[deleteStudent] Deleting student ${studentId}. IMPORTANT: Dependency checks (e.g., mark submissions) are not yet implemented.`);
    await deleteDoc(doc(db, "students", studentId));
    revalidatePath("/dos/students");
    return { success: true, message: "Student deleted successfully. Note: Associated marks or historical data were not automatically handled." };
  } catch (error) {
    console.error(`Error in deleteStudent for ${studentId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete student: ${errorMessage}` };
  }
}

export async function deleteAllStudents(): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  try {
    const studentsRef = collection(db, "students");
    const snapshot = await getDocs(studentsRef);
    if (snapshot.empty) {
        return { success: true, message: "No students to delete." };
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath("/dos/students");
    return { success: true, message: `Successfully deleted ${snapshot.size} student records.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("Error in deleteAllStudents:", error);
    return { success: false, message: `Failed to delete all students: ${errorMessage}` };
  }
}

export async function deleteStudentsByClass(classId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  if (!classId) {
      return { success: false, message: "Class ID is required." };
  }
  try {
    const studentsQuery = query(collection(db, "students"), where("classId", "==", classId));
    const snapshot = await getDocs(studentsQuery);
     if (snapshot.empty) {
        return { success: true, message: "No students found in the selected class to delete." };
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath("/dos/students");
    return { success: true, message: `Successfully deleted ${snapshot.size} students from the selected class.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error(`Error deleting students for class ${classId}:`, error);
    return { success: false, message: `Failed to delete students by class: ${errorMessage}` };
  }
}

// --- Class & Subject Management ---
export async function createClass(
  classData: Omit<ClassInfo, 'id' | 'subjects'> & { subjectIds: string[], streams: string[] }
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
      streams: restOfClassData.streams || [],
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
        streams: classDataToSave.streams,
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
      streams: classData.streams || [],
      classTeacherId: classData.classTeacherId === null ? undefined : classData.classTeacherId,
      subjects: subjectsArray
    } as ClassInfo;
  } catch (error) {
    console.error(`Error fetching class ${classId}:`, error);
    return null;
  }
}

export async function updateClass(classId: string, classData: Partial<Omit<ClassInfo, 'id' | 'subjects'>> & { subjectIds?: string[], streams?: string[] }): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const classRef = doc(db, "classes", classId);
    const { subjectIds, streams, ...restOfClassData } = classData;
    let dataToUpdate: any = { ...restOfClassData };

    if (subjectIds) {
      dataToUpdate.subjectReferences = subjectIds.map(id => doc(db, "subjects", id));
    }
    if (streams) {
      dataToUpdate.streams = streams;
    }
    dataToUpdate.classTeacherId = dataToUpdate.classTeacherId || null;

    await updateDoc(classRef, dataToUpdate);
    revalidatePath("/dos/classes");
    revalidatePath(`/dos/classes/${classId}/edit`);
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

export async function deleteSubject(subjectId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  try {
    // Dependency check: Check if the subject is assigned to any class
    const subjectRefToDelete = doc(db, "subjects", subjectId);
    const classesRef = collection(db, "classes");
    const q = query(classesRef, where("subjectReferences", "array-contains", subjectRefToDelete));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const classNames = querySnapshot.docs.map(d => d.data().name).join(', ');
      return { 
        success: false, 
        message: `Cannot delete subject. It is currently assigned to the following class(es): ${classNames}. Please unassign it first.` 
      };
    }

    // TODO: Consider checking if this subject is used in any 'exams' or 'markSubmissions'
    console.warn(`[deleteSubject] Deleting subject ${subjectId}. Further dependency checks (e.g., exams, mark submissions) are not yet implemented.`);

    await deleteDoc(subjectRefToDelete);
    revalidatePath("/dos/classes"); // Revalidate page showing subjects
    return { success: true, message: "Subject deleted successfully." };
  } catch (error) {
    console.error(`Error deleting subject ${subjectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete subject: ${errorMessage}` };
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
      stream: examData.stream || null,
      marksSubmissionDeadline: examData.marksSubmissionDeadline || null,
      gradingPolicyId: examData.gradingPolicyId || null,
    };
    const docRef = await addDoc(collection(db, "exams"), examPayload);
    const newExam: Exam = {
        id: docRef.id,
        name: examPayload.name,
        termId: examPayload.termId,
        maxMarks: examPayload.maxMarks,
        description: examPayload.description === null ? undefined : examData.description,
        examDate: examPayload.examDate === null ? undefined : examData.examDate,
        classId: examPayload.classId === null ? undefined : examData.classId,
        subjectId: examPayload.subjectId === null ? undefined : examData.subjectId,
        teacherId: examPayload.teacherId === null ? undefined : examData.teacherId,
        stream: examPayload.stream === null ? undefined : examData.stream,
        marksSubmissionDeadline: examPayload.marksSubmissionDeadline === null ? undefined : examData.marksSubmissionDeadline,
        gradingPolicyId: examPayload.gradingPolicyId === null ? undefined : examData.gradingPolicyId,
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
        stream: data.stream === null ? undefined : data.stream,
        marksSubmissionDeadline: data.marksSubmissionDeadline === null ? undefined : data.marksSubmissionDeadline,
        gradingPolicyId: data.gradingPolicyId === null ? undefined : data.gradingPolicyId,
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
    const fieldsToPotentiallyNullify = ['description', 'examDate', 'classId', 'subjectId', 'teacherId', 'stream', 'marksSubmissionDeadline', 'gradingPolicyId'];
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

export async function deleteExam(examId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const batch = writeBatch(db);

    // Find and delete all associated mark submissions
    const submissionsRef = collection(db, "markSubmissions");
    const submissionsQuery = query(
      submissionsRef,
      where("assessmentId", ">=", `${examId}_`),
      where("assessmentId", "<", `${examId}_\uf8ff`)
    );
    const submissionsSnapshot = await getDocs(submissionsQuery);
    
    let deletedSubmissionsCount = 0;
    if (!submissionsSnapshot.empty) {
      submissionsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedSubmissionsCount++;
      });
    }

    // Remove this examId from any Teacher's subjectsAssigned.examIds array
    const teachersRef = collection(db, "teachers");
    const teachersSnapshot = await getDocs(teachersRef);
    teachersSnapshot.forEach(teacherDoc => {
      const teacherData = teacherDoc.data() as Teacher;
      if (teacherData.subjectsAssigned && teacherData.subjectsAssigned.length > 0) {
        let wasModified = false;
        const newSubjectsAssigned = teacherData.subjectsAssigned.map(assignment => {
          if (assignment.examIds && assignment.examIds.includes(examId)) {
            wasModified = true;
            return {
              ...assignment,
              examIds: assignment.examIds.filter(id => id !== examId)
            };
          }
          return assignment;
        }).filter(assignment => assignment.examIds.length > 0); 

        if (wasModified) {
          batch.update(teacherDoc.ref, { subjectsAssigned: newSubjectsAssigned });
        }
      }
    });

    // Finally, delete the exam itself
    const examRef = doc(db, "exams", examId);
    batch.delete(examRef);

    await batch.commit();
    
    revalidatePath("/dos/settings/exams");
    revalidatePath("/dos/teachers/assignments");

    const message = `Exam and ${deletedSubmissionsCount} associated mark submission(s) deleted successfully.`;
    return { success: true, message };
  } catch (error) {
    console.error(`Error in deleteExam for ${examId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete exam: ${errorMessage}` };
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
      
      // Also update the defaultGradingScale in general settings
      const settingsRef = doc(db, "settings", "general");
      await setDoc(settingsRef, { defaultGradingScale: policyPayload.scale }, { merge: true });
    }

    const docRef = await addDoc(collection(db, "gradingPolicies"), policyPayload);
    const newPolicy: GradingPolicy = { id: docRef.id, ...policyPayload };
    revalidatePath("/dos/settings/exams");
    revalidatePath("/dos/settings/general"); // Revalidate general settings page
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

        // Also update the defaultGradingScale in general settings
        const settingsRef = doc(db, "settings", "general");
        await setDoc(settingsRef, { defaultGradingScale: policyPayload.scale }, { merge: true });
    }

    await updateDoc(policyRef, policyPayload);
    revalidatePath("/dos/settings/exams");
    revalidatePath(`/dos/settings/grading/${policyId}/edit`);
    revalidatePath("/dos/settings/general"); // Revalidate general settings page
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

export async function deleteGradingPolicy(policyId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }

  try {
    const policyRef = doc(db, "gradingPolicies", policyId);
    const policySnap = await getDoc(policyRef);

    if (!policySnap.exists()) {
      return { success: false, message: "Grading policy not found." };
    }

    if (policySnap.data().isDefault) {
      return { success: false, message: "Cannot delete the default grading policy. Please set another policy as default first." };
    }

    const examsRef = collection(db, "exams");
    const q = query(examsRef, where("gradingPolicyId", "==", policyId), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const examName = querySnapshot.docs[0].data().name;
      return { 
        success: false, 
        message: `Cannot delete policy. It is currently assigned to at least one exam (e.g., "${examName}"). Please assign a different policy to all dependent exams first.`
      };
    }

    await deleteDoc(policyRef);
    revalidatePath("/dos/settings/exams");
    return { success: true, message: "Grading policy deleted successfully." };

  } catch (error) {
    console.error(`Error deleting grading policy ${policyId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete policy: ${errorMessage}` };
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

// --- General Settings ---
export async function updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const settingsRef = doc(db, "settings", "general");
    
    // Build a payload with only the fields that are explicitly passed in.
    // This prevents accidentally overwriting fields (like defaultGradingScale) that are managed elsewhere.
    const settingsToSave: { [key: string]: any } = {};

    // Iterate over the keys in the input 'settings' object
    for (const key in settings) {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
            const typedKey = key as keyof GeneralSettings;
            const value = settings[typedKey];

            // For fields that can be cleared, store null instead of empty string/undefined
            if (['currentTermId', 'globalMarksSubmissionDeadline', 'dosGlobalAnnouncementText', 'dosGlobalAnnouncementType', 'teacherDashboardResourcesText', 'dosGlobalAnnouncementImageUrl'].includes(typedKey)) {
                settingsToSave[typedKey] = value || null;
            } else if (typedKey === 'defaultGradingScale') { // Handle grading scale separately
                settingsToSave[typedKey] = Array.isArray(value) ? value : [];
            } else { // Handle other fields like markSubmissionTimeZone
                settingsToSave[typedKey] = value;
            }
        }
    }

    if (Object.keys(settingsToSave).length === 0) {
        return { success: true, message: "No settings were provided to update." };
    }

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

// --- Report Generation & Data Analysis ---

function calculateGrade(
  score: number | null,
  maxMarks: number,
  scale: GradingScaleItem[]
): string {
  if (score === null || !maxMarks || scale.length === 0) return 'N/A';
  const percentage = (score / maxMarks) * 100;
  for (const tier of scale) {
    if (percentage >= tier.minScore && percentage <= tier.maxScore) {
      return tier.grade;
    }
  }
  return 'Ungraded'; // For scores outside all defined ranges
}


export async function getMarksForReview(
  classId: string,
  subjectId: string,
  examId: string,
  stream?: string
): Promise<MarksForReviewPayload> {
  const defaultPayload: MarksForReviewPayload = { submissionId: null, assessmentName: null, marks: [], dosStatus: undefined, dosRejectReason: undefined };
  if (!db) {
    console.error("[DOS Action - getMarksForReview] CRITICAL_ERROR_DB_NULL: Firestore db object is null.");
    return defaultPayload;
  }

  const compositeAssessmentId = `${examId}_${classId}_${subjectId}`;
  console.log(`[DOS Action - getMarksForReview] Fetching marks for Class ID: ${classId}, Subject ID: ${subjectId}, Exam ID: ${examId}, Stream: ${stream || 'All'}.`);

  try {
    const markSubmissionsRef = collection(db, "markSubmissions");
    const q = query(
      markSubmissionsRef,
      where("assessmentId", "==", compositeAssessmentId),
      orderBy("dateSubmitted", "desc"),
      limit(1)
    );
    const submissionSnapshot = await getDocs(q);
    
    if (submissionSnapshot.empty) {
      console.warn(`[DOS Action - getMarksForReview] NO SUBMISSION DOCUMENT FOUND for composite assessmentId: "${compositeAssessmentId}"`);
      return defaultPayload;
    }

    const latestSubmissionDoc = submissionSnapshot.docs[0];
    const submissionData = latestSubmissionDoc.data() as MarkSubmissionFirestoreRecord;
    const assessmentName = submissionData.assessmentName || "Assessment Name Not Recorded";
    console.log(`[DOS Action - getMarksForReview] Found submission doc ID: ${latestSubmissionDoc.id} for composite assessmentId: "${compositeAssessmentId}".`);

    if (!submissionData.submittedMarks || submissionData.submittedMarks.length === 0) {
      console.log(`[DOS Action - getMarksForReview] Submission found (ID: ${latestSubmissionDoc.id}) but contains no marks.`);
      return { ...defaultPayload, submissionId: latestSubmissionDoc.id, assessmentName: assessmentName, dosStatus: submissionData.dosStatus, dosRejectReason: submissionData.dosRejectReason };
    }

    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, s]));

    let marksToProcess = submissionData.submittedMarks;
    
    // If a stream is specified, filter the marks
    if (stream) {
        console.log(`[DOS Action - getMarksForReview] Filtering marks for stream: "${stream}".`);
        const studentIdsInStream = new Set<string>();
        allStudents.forEach(s => {
            if (s.classId === classId && s.stream === stream) {
                studentIdsInStream.add(s.studentIdNumber);
            }
        });
        
        marksToProcess = submissionData.submittedMarks.filter(mark => 
            studentIdsInStream.has(mark.studentId)
        );
        console.log(`[DOS Action - getMarksForReview] Original marks: ${submissionData.submittedMarks.length}, Filtered marks for stream "${stream}": ${marksToProcess.length}.`);
    }

    const marksForReview: MarksForReviewEntry[] = marksToProcess.map(mark => ({
      studentId: mark.studentId,
      grade: mark.score,
      studentName: studentsMap.get(mark.studentId) ? `${studentsMap.get(mark.studentId)!.firstName} ${studentsMap.get(mark.studentId)!.lastName}` : "Unknown Student",
    }));

    let teacherName: string | undefined;
    if (submissionData.teacherId) {
        try {
            const teacher = await getTeacherById(submissionData.teacherId);
            teacherName = teacher?.name;
        } catch(e) {
            console.error(`Error fetching teacher name for ID ${submissionData.teacherId}:`, e);
        }
    }

    console.log(`[DOS Action - getMarksForReview] Processed ${marksForReview.length} marks for review.`);
    return {
        submissionId: latestSubmissionDoc.id,
        assessmentName: assessmentName,
        marks: marksForReview,
        dosStatus: submissionData.dosStatus,
        dosRejectReason: submissionData.dosRejectReason,
        teacherId: submissionData.teacherId,
        teacherName: teacherName
    };

  } catch (error: any) {
    console.error(`[DOS Action - getMarksForReview] ERROR fetching marks for review:`, error);
     if (error.code === 'failed-precondition') {
      const specificErrorMessage = "FIRESTORE ERROR (getMarksForReview): The query requires an index. This typically involves 'assessmentId' (Ascending) and 'dateSubmitted' (Descending) on the 'markSubmissions' collection. Please create this index in your Firebase Firestore console.";
      console.error("*********************************************************************************");
      console.error(specificErrorMessage);
      console.error("*********************************************************************************");
      return { ...defaultPayload, submissionId: `ERROR_MISSING_INDEX_${compositeAssessmentId}`, assessmentName: specificErrorMessage };
    }
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
        });
        revalidatePath("/dos/marks-review");

        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
            const teacherId = submissionSnap.data().teacherId;
            if (teacherId) {
                revalidatePath(`/teacher/marks/history`);
                revalidatePath(`/teacher/marks/submit`);
                revalidatePath(`/teacher/dashboard`);
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
        });
        revalidatePath("/dos/marks-review");
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
            const teacherId = submissionSnap.data().teacherId;
             if (teacherId) {
                revalidatePath(`/teacher/marks/history`);
                revalidatePath(`/teacher/marks/submit`);
                revalidatePath(`/teacher/dashboard`);
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
  updatedMarks: Array<{ studentId: string; score: number | null }>
): Promise<{ success: boolean; message: string }> {
  if (!db) return { success: false, message: "Firestore not initialized." };
  if (!submissionId) return { success: false, message: "Submission ID is required." };

  try {
    const submissionRef = doc(db, "markSubmissions", submissionId);
    
    const marksWithScores = updatedMarks.filter(mark => mark.score !== null && typeof mark.score === 'number');
    const studentCountWithScores = marksWithScores.length;
    const totalScore = marksWithScores.reduce((sum, mark) => sum + (mark.score as number), 0);
    const averageScore = studentCountWithScores > 0 ? totalScore / studentCountWithScores : null;
    const studentCount = updatedMarks.length;

    await updateDoc(submissionRef, {
      submittedMarks: updatedMarks,
      studentCount: studentCount,
      averageScore: averageScore,
      dosEdited: true, 
      dosLastEditedAt: Timestamp.now(),
    });

    revalidatePath(`/dos/marks-review`);
    return { success: true, message: "Marks updated by D.O.S. successfully." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error.";
    console.error(`Error in updateSubmittedMarksByDOS for ${submissionId}:`, error);
    return { success: false, message: `Failed to update marks: ${msg}` };
  }
}

export async function downloadSingleMarkSubmission(
    submissionId: string,
    format: 'csv' | 'xlsx'
): Promise<{ success: boolean; message: string; data?: string; filename?: string }> {
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
    const assessmentNameSlug = (submissionData.assessmentName || "submission").replace(/[^a-zA-Z0-9_]/g, '_');

    if (!submissionData.submittedMarks || submissionData.submittedMarks.length === 0) {
      return { success: false, message: "No marks found in this submission." };
    }

    const allStudents = await getStudents();
    const studentsMap = new Map(allStudents.map(s => [s.studentIdNumber, `${s.firstName} ${s.lastName}`]));
    
    const examId = submissionData.assessmentId.split('_')[0];
    const exam = await getExamById(examId);
    const maxMarks = exam?.maxMarks || 100;
    let gradingScale: GradingScaleItem[] = [];

    if (exam?.gradingPolicyId) {
        const policy = await getGradingPolicyById(exam.gradingPolicyId);
        if (policy?.scale) gradingScale = policy.scale;
    } 
    if (gradingScale.length === 0) {
        const settings = await getGeneralSettings();
        gradingScale = settings.defaultGradingScale || [];
    }

    const studentMarksData = submissionData.submittedMarks.map(mark => ({
      'Student ID': mark.studentId,
      'Student Name': studentsMap.get(mark.studentId) || 'Unknown Student',
      'Score': mark.score,
      'Grade': calculateGrade(mark.score, maxMarks, gradingScale),
    }));

    if (format === 'csv') {
      const headerRow = Object.keys(studentMarksData[0]).join(',');
      const dataRows = studentMarksData.map(row =>
        Object.values(row).map(value => {
          const stringValue = String(value === undefined || value === null ? '' : value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );
      const csvData = `${headerRow}\n${dataRows.join('\n')}`;
      return { success: true, message: "CSV data prepared.", data: csvData, filename: `${assessmentNameSlug}_report.csv` };
    }
    
    if (format === 'xlsx') {
        const reportTitle = `${submissionData.assessmentName || "Marks Report"}`;
        const generatedOn = `Generated on: ${new Date().toLocaleString()}`;

        // Create the worksheet from JSON data first
        const worksheet = XLSX.utils.json_to_sheet(studentMarksData, {
            header: ["Student ID", "Student Name", "Score", "Grade"],
            skipHeader: true, // We'll add a styled header manually
        });

        // Prepend styled header, title, and subtitle
        XLSX.utils.sheet_add_aoa(worksheet, [
            [{ v: reportTitle, s: { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } } }],
            [{ v: generatedOn, s: { font: { sz: 10, italic: true }, alignment: { horizontal: "center" } } }],
            [], // Spacer row
            ["Student ID", "Student Name", "Score", "Grade"].map(h => ({ v: h, s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F81BD" } } } }))
        ], { origin: "A1" });

        // Merge title and subtitle cells
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // Subtitle
        ];

        // Calculate column widths
        const colWidths = [
            { wch: 15 }, // Student ID
            { wch: 25 }, // Student Name
            { wch: 10 }, // Score
            { wch: 10 }  // Grade
        ];
        worksheet['!cols'] = colWidths;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Report');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        const base64Data = Buffer.from(excelBuffer).toString('base64');
        
        return { success: true, message: "Excel file prepared.", data: base64Data, filename: `${assessmentNameSlug}_report.xlsx` };
    }

    return { success: false, message: "Invalid format selected." };
  } catch (error) {
    console.error(`Error in downloadSingleMarkSubmission for ID ${submissionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to prepare submission data: ${errorMessage}` };
  }
}

export async function getAssessmentAnalysisData(classId: string, subjectId: string, examId: string, stream?: string): Promise<{ success: boolean; message: string; data?: AssessmentAnalysisData }> {
  const marksPayload = await getMarksForReview(classId, subjectId, examId, stream); // Pass stream here

  if (!marksPayload.submissionId || marksPayload.marks.length === 0) {
    return { success: false, message: "No submitted marks found for the selected assessment to analyze." };
  }
  
  // No need to filter again here as getMarksForReview now handles it
  let marksToAnalyze = marksPayload.marks;

  const scores = marksToAnalyze.map(m => m.grade).filter((g): g is number => g !== null && g !== undefined);
  
  if (scores.length === 0) {
      return { success: false, message: "No valid scores available for analysis in the selected scope."};
  }

  // Get grading scale
  const exam = await getExamById(examId);
  const maxMarks = exam?.maxMarks || 100;
  let gradingScale: GradingScaleItem[] = [];
  if (exam?.gradingPolicyId) {
      const policy = await getGradingPolicyById(exam.gradingPolicyId);
      if (policy?.scale) gradingScale = policy.scale;
  } 
  if (gradingScale.length === 0) {
      const settings = await getGeneralSettings();
      gradingScale = settings.defaultGradingScale || [];
  }

  const marksWithGrades = marksToAnalyze.map(m => ({
    studentId: m.studentId,
    studentName: m.studentName,
    score: m.grade,
    grade: calculateGrade(m.grade, maxMarks, gradingScale),
    rank: 0, // Temporary rank
  }));

  // Sort by score descending to calculate rank
  marksWithGrades.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));

  // Assign ranks, handling ties correctly
  let currentRank = 0;
  let lastScore = -1;
  marksWithGrades.forEach((student, index) => {
    if (student.score !== lastScore) {
      currentRank = index + 1;
      lastScore = student.score as number;
    }
    student.rank = currentRank;
  });

  // Summary statistics
  const count = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sortedScores[mid - 1] + sortedScores[mid]) / 2 : sortedScores[mid];
  
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const range = highest - lowest;
  const variance = scores.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(variance);
  
  const modeMap = new Map<number, number>();
  scores.forEach(score => modeMap.set(score, (modeMap.get(score) || 0) + 1));
  let maxFreq = 0;
  let modes: number[] = [];
  modeMap.forEach((freq, score) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      modes = [score];
    } else if (freq === maxFreq) {
      modes.push(score);
    }
  });

  // Grade Distribution
  const gradeDistMap = new Map<string, number>();
  marksWithGrades.forEach(m => gradeDistMap.set(m.grade, (gradeDistMap.get(m.grade) || 0) + 1));
  const gradeDistribution = Array.from(gradeDistMap.entries()).map(([grade, count]) => ({ grade, count })).sort((a,b) => a.grade.localeCompare(b.grade));
  
  // Score Frequency
  const scoreFreqMap = new Map<string, number>();
  const binSize = 10;
  scores.forEach(score => {
    const binStart = Math.floor(score / binSize) * binSize;
    const binEnd = binStart + binSize -1;
    const rangeKey = `${binStart === 0 ? 0 : binStart+1}-${binEnd > maxMarks ? maxMarks : binEnd}`;
    scoreFreqMap.set(rangeKey, (scoreFreqMap.get(rangeKey) || 0) + 1);
  });
  const scoreFrequency = Array.from(scoreFreqMap.entries()).map(([range, count]) => ({ range, count })).sort((a,b) => parseInt(a.range.split('-')[0]) - parseInt(b.range.split('-')[0]));
  
  const analysisData: AssessmentAnalysisData = {
    submissionId: marksPayload.submissionId,
    assessmentName: marksPayload.assessmentName || 'Unnamed Assessment',
    summary: { count, mean, median, mode: modes, stdDev, highest, lowest, range },
    gradeDistribution,
    scoreFrequency,
    marks: marksWithGrades,
  };

  return { success: true, message: "Analysis complete.", data: analysisData };
}

// Data fetch functions used across the D.O.S. portal
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
        uid: data.uid,
        name: data.name,
        email: data.email,
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
        stream: data.stream,
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
                streams: classData.streams || [],
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
                stream: data.stream === null ? undefined : data.stream,
                marksSubmissionDeadline: data.marksSubmissionDeadline === null ? undefined : data.marksSubmissionDeadline,
                gradingPolicyId: data.gradingPolicyId === null ? undefined : data.gradingPolicyId,
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
        dosGlobalAnnouncementImageUrl: undefined,
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
                dosGlobalAnnouncementImageUrl: data.dosGlobalAnnouncementImageUrl === null ? undefined : data.dosGlobalAnnouncementImageUrl,
                teacherDashboardResourcesText: data.teacherDashboardResourcesText === null ? undefined : data.teacherDashboardResourcesText,
                isDefaultTemplate: false,
            } as GeneralSettings & { isDefaultTemplate: boolean };
        }
        console.warn("[DOS Action - getGeneralSettings] 'settings/general' document does not exist. Creating with default template settings.");
        const defaultSettings: GeneralSettings & { isDefaultTemplate: boolean } = {
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }, { grade: 'B', minScore: 70, maxScore: 79 }],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Welcome to GradeCentral! Please configure system settings via the D.O.S. portal.",
            dosGlobalAnnouncementType: "info",
            dosGlobalAnnouncementImageUrl: undefined,
            teacherDashboardResourcesText: "Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. Stay updated with notifications from the D.O.S. and ensure timely submission of grades. If you encounter any issues, please contact the administration.",
            isDefaultTemplate: true,
        };
        await setDoc(settingsRef, {
            defaultGradingScale: defaultSettings.defaultGradingScale,
            markSubmissionTimeZone: defaultSettings.markSubmissionTimeZone,
            currentTermId: defaultSettings.currentTermId || null,
            globalMarksSubmissionDeadline: defaultSettings.globalMarksSubmissionDeadline || null,
            dosGlobalAnnouncementText: defaultSettings.dosGlobalAnnouncementText || null,
            dosGlobalAnnouncementType: defaultSettings.dosGlobalAnnouncementType || null,
            dosGlobalAnnouncementImageUrl: defaultSettings.dosGlobalAnnouncementImageUrl || null,
            teacherDashboardResourcesText: defaultSettings.teacherDashboardResourcesText || null,
        });
        revalidatePath("/dos/settings/general");
        return defaultSettings;
    } catch (error) {
        console.error("[DOS Action - getGeneralSettings] Error fetching general settings:", error);
        return {
            defaultGradingScale: [],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosGlobalAnnouncementText: "Error fetching announcements due to a server error.",
            dosGlobalAnnouncementType: "warning",
            dosGlobalAnnouncementImageUrl: undefined,
            teacherDashboardResourcesText: "Could not load teacher resources text due to a server error. Please contact support.",
            isDefaultTemplate: true,
        };
    }
}
