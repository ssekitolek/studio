

"use server";

import type { Teacher, Student, ClassInfo, Subject, Term, Exam, GeneralSettings, GradingPolicy, GradingScaleItem, GradeEntry as GenkitGradeEntry, MarkSubmissionFirestoreRecord, AnomalyExplanation, MarksForReviewPayload, MarksForReviewEntry, AssessmentAnalysisData, DailyAttendanceRecord, DOSAttendanceSummary, StudentDetail, ReportCardData } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, where, query, limit, DocumentReference, runTransaction, writeBatch, Timestamp, orderBy, setDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";


// This file contains actions that DO NOT require the Firebase Admin SDK.
// It is safe to be bundled with client components.

export async function createTeacherWithRole(teacherData: Omit<Teacher, 'id' | 'uid' | 'subjectsAssigned'> & { password: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  if (!db || !auth) {
    return { success: false, message: "Firebase is not initialized." };
  }
  try {
    const { email, password, name, role } = teacherData;

    // This is a temporary admin auth context to create the user. It signs out immediately.
    const tempAdminUserCredential = await signInWithEmailAndPassword(auth, "root@adminmathius.staff", "mathius256");
    const newTeacherCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = newTeacherCredential.user;

    const teacherPayload: Omit<Teacher, 'id'> = {
      uid: user.uid,
      name,
      email,
      role,
      subjectsAssigned: [],
    };
    
    await setDoc(doc(db, "teachers", user.uid), teacherPayload);

    // Sign back in as the admin user to continue session
    await signInWithEmailAndPassword(auth, "root@adminmathius.staff", "mathius256");

    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher account created successfully.", teacher: { id: user.uid, ...teacherPayload } };

  } catch (error: any) {
    let message = error.message || 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-in-use') {
        message = `An account with the email ${teacherData.email} already exists.`;
    }
     // Attempt to sign back in as the admin user even if creation fails
    await signInWithEmailAndPassword(auth, "root@adminmathius.staff", "mathius256").catch(e => console.error("Failed to re-authenticate admin after error:", e));
    console.error("Error in createTeacherWithRole:", error);
    return { success: false, message };
  }
}

export async function updateTeacherWithRole(teacherId: string, teacherData: Partial<Omit<Teacher, 'id' | 'subjectsAssigned' | 'uid'>>): Promise<{ success: boolean; message: string; teacher?: Partial<Teacher> }> {
   if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  try {
    const teacherDocRef = doc(db, "teachers", teacherId);
    await updateDoc(teacherDocRef, teacherData);
    revalidatePath("/dos/teachers");
    revalidatePath(`/dos/teachers/${teacherId}/edit`);
    return { success: true, message: "Teacher account updated successfully.", teacher: teacherData };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}


export async function deleteTeacherWithRole(teacherId: string, teacherEmail: string, teacherPass: string): Promise<{ success: boolean; message: string }> {
  // This is a workaround due to lack of admin SDK. It's not ideal for production.
  // It requires re-authenticating as the user to delete them.
  if (!auth || !db) return { success: false, message: "Firebase not initialized" };
  try {
      // Step 1: Sign in as the user to be deleted.
      const userCredential = await signInWithEmailAndPassword(auth, teacherEmail, teacherPass);
      const userToDelete = userCredential.user;

      if (userToDelete.uid !== teacherId) {
          throw new Error("Mismatch between provided ID and authenticated user UID.");
      }

      // Step 2: Delete the user from Firebase Auth
      await deleteUser(userToDelete);
      
      // Step 3: Delete the user's document from Firestore
      await deleteDoc(doc(db, "teachers", teacherId));

      // Step 4: Re-authenticate the D.O.S. user to continue their session
      await signInWithEmailAndPassword(auth, "root@adminmathius.staff", "mathius256");
      
      revalidatePath("/dos/teachers");
      return { success: true, message: "Teacher deleted successfully from Auth and Firestore." };
  } catch (error: any) {
      console.error(`Error deleting teacher ${teacherId}:`, error);
      // Attempt to re-authenticate D.O.S. even if deletion fails
      await signInWithEmailAndPassword(auth, "root@adminmathius.staff", "mathius256").catch(e => console.error("Failed to re-authenticate DOS after deletion error:", e));

      let message = "An unknown error occurred during deletion.";
      if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          message = "Could not delete teacher. The system requires the teacher's password to perform this action, and the provided one was incorrect or not found. This is a system limitation. Please contact support.";
      } else if (error.code) {
          message = `Failed to delete teacher: ${error.code}`;
      }
      return { success: false, message };
  }
}


// --- Teacher Management ---
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
        uid: teacherSnap.id, // The document ID IS the UID
        name: data.name,
        email: data.email,
        role: data.role,
        subjectsAssigned: data.subjectsAssigned || [],
      } as Teacher;
    }
    console.warn(`[getTeacherById] Teacher document not found for ID: ${teacherId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching teacher ${teacherId}:`, error);
    return null;
  }
}

export async function updateTeacherAssignments(
  teacherId: string, // This is the Auth UID and Firestore Doc ID
  data: {
    classTeacherForClassIds: string[];
    specificSubjectAssignments: Array<{ subjectId: string; classIds: string[] }>;
  }
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }

  const validSpecificAssignments = Array.isArray(data.specificSubjectAssignments)
    ? data.specificSubjectAssignments.filter(
        (assignment) =>
          assignment &&
          typeof assignment.subjectId === 'string' &&
          assignment.subjectId.trim() !== '' &&
          Array.isArray(assignment.classIds) &&
          assignment.classIds.every(id => typeof id === 'string' && id.trim() !== '')
      ).map(a => ({ subjectId: a.subjectId, classIds: a.classIds }))
    : [];

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
        const currentClassTeacherId = classDoc.data().classTeacherId;

        // If this class is in the list to be assigned to the current teacher
        if (data.classTeacherForClassIds.includes(classDoc.id)) {
          // And it's not already assigned to them, update it.
          if (currentClassTeacherId !== teacherId) {
            transaction.update(classRef, { classTeacherId: teacherId });
          }
        } else { // If this class is NOT in the list
          // And it IS currently assigned to this teacher, unassign it.
          if (currentClassTeacherId === teacherId) {
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
  classData: Omit<ClassInfo, 'id'>
): Promise<{ success: boolean; message: string; classInfo?: ClassInfo }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const classDataToSave = {
      ...classData,
      streams: classData.streams || [],
      classTeacherId: null, // Teacher is assigned separately
    };

    const docRef = await addDoc(collection(db, "classes"), classDataToSave);
    
    const newClass: ClassInfo = {
      ...classDataToSave,
      id: docRef.id,
      classTeacherId: undefined, // Ensure it aligns with the type
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
    return {
      id: classSnap.id,
      name: classData.name || "Unnamed Class",
      level: classData.level || "Unknown Level",
      streams: classData.streams || [],
      classTeacherId: classData.classTeacherId === null ? undefined : classData.classTeacherId,
    } as ClassInfo;
  } catch (error) {
    console.error(`Error fetching class ${classId}:`, error);
    return null;
  }
}

export async function updateClass(classId: string, classData: Partial<Omit<ClassInfo, 'id'>>): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized. Check Firebase configuration." };
  }
  try {
    const classRef = doc(db, "classes", classId);
    let dataToUpdate: any = { ...classData };

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
    const teachersRef = collection(db, "teachers");
    const snapshot = await getDocs(teachersRef);
    for (const doc of snapshot.docs) {
      const teacher = doc.data() as Teacher;
      if (teacher.subjectsAssigned && teacher.subjectsAssigned.some(a => a.subjectId === subjectId)) {
        const teacherName = teacher.name || `Teacher ID ${doc.id}`;
        return {
          success: false,
          message: `Cannot delete subject. It is assigned to ${teacherName}. Please update teacher assignments first.`,
        };
      }
    }
    
    console.warn(`[deleteSubject] Deleting subject ${subjectId}. Further dependency checks (e.g., exams, mark submissions) are not yet implemented.`);
    await deleteDoc(doc(db, "subjects", subjectId));
    revalidatePath("/dos/classes");
    revalidatePath("/dos/teachers/assignments");
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
      category: examData.category || null,
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
        category: examPayload.category === null ? undefined : examData.category,
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
        category: data.category === null ? undefined : data.category,
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
    const fieldsToPotentiallyNullify = ['description', 'examDate', 'classId', 'subjectId', 'teacherId', 'stream', 'marksSubmissionDeadline', 'gradingPolicyId', 'category'];
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
    return { success: false, message: "Firestore is not initialized." };
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

    // This logic is now obsolete due to the new assignment model.
    // Kept empty to avoid breaking the call signature if needed elsewhere, but can be removed.
    // await updateDoc for teachers is not needed here anymore.

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
            if (['currentTermId', 'globalMarksSubmissionDeadline', 'dosWelcomeText', 'dosWelcomeImageUrl', 'dosGlobalAnnouncementText', 'dosGlobalAnnouncementType', 'teacherDashboardResourcesText', 'teacherDashboardResourcesImageUrl'].includes(typedKey)) {
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

    await setDoc(settingsRef, { ...settingsToSave }, { merge: true });
    
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

const GRADE_DESCRIPTORS: { [key: string]: string } = {
  'A': 'Achieved extraordinary level of competencies.',
  'B': 'Achieved good level of competencies.',
  'C': 'Achieved adequate level of competencies.',
  'D': 'Achieved minimum level of competencies.',
  'E': 'Achieved basic level of competencies.',
};

function getGradeDescriptor(grade: string): string {
    return GRADE_DESCRIPTORS[grade] || 'Competency level not specified.';
}


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
  const defaultPayload: MarksForReviewPayload = { submissionId: null, assessmentName: null, marks: [] };
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
    
    // Fetch all entities needed for payload
    const [exam, subject, cls, allStudents] = await Promise.all([
      getExamById(examId),
      getSubjectById(subjectId),
      getClassById(classId),
      getStudents()
    ]);
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
        teacherName: teacherName,
        exam,
        subject,
        class: cls,
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
            skipHeader: true, // We'll add a styled header manually
        });
        
        const styledHeader = ["Student ID", "Student Name", "Score", "Grade"].map(h => ({ v: h, s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F81BD" } } } }));

        // Prepend styled header, title, and subtitle
        XLSX.utils.sheet_add_aoa(worksheet, [
            [{ v: reportTitle, s: { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } } }],
            [{ v: generatedOn, s: { font: { sz: 10, italic: true }, alignment: { horizontal: "center" } } }],
            [], // Spacer row
            styledHeader
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

export async function getReportCardData(studentId: string, termId: string, reportTitle: string): Promise<{ success: boolean; message: string; data?: ReportCardData }> {
    if (!db) return { success: false, message: "Database not initialized." };

    try {
        const [student, term, allSubjects, allExams, allTeachers, gradingPolicies, generalSettings] = await Promise.all([
            getStudentById(studentId),
            getTermById(termId),
            getSubjects(),
            getExams(),
            getTeachers(),
            getGradingPolicies(),
            getGeneralSettings()
        ]);
        
        if (!student || !term) return { success: false, message: "Student or term not found." };
        const studentClass = await getClassById(student.classId);
        if(!studentClass) return { success: false, message: "Student's class not found." };

        const examsForTerm = allExams.filter(e => e.termId === termId);
        const aoiExams = examsForTerm.filter(e => e.category === 'Formative');
        const eotExams = examsForTerm.filter(e => e.category === 'Summative');

        const subjectsInClass = new Map<string, Subject>();
        allTeachers.forEach(teacher => {
          if (teacher.subjectsAssigned) {
            teacher.subjectsAssigned.forEach(sa => {
              if (sa.classIds.includes(student.classId)) {
                const subject = allSubjects.find(s => s.id === sa.subjectId);
                if (subject && !subjectsInClass.has(subject.id)) {
                    subjectsInClass.set(subject.id, subject);
                }
              }
            });
          }
        });
        
        const assessmentIdsToFetch = new Set<string>();
        
        examsForTerm.forEach(exam => {
            const isForStudentsClass = !exam.classId || exam.classId === student.classId;
            const isForStudentsStream = !exam.stream || exam.stream === student.stream;
            
            // An exam is relevant if it's not tied to a specific subject (general exam)
            // OR if it's tied to a subject that is taught in the student's class.
            const isRelevantExam = isForStudentsClass && isForStudentsStream && (!exam.subjectId || subjectsInClass.has(exam.subjectId));

            if(isRelevantExam) {
                if(!exam.subjectId) { // General exam for the whole class
                    subjectsInClass.forEach(subject => {
                        assessmentIdsToFetch.add(`${exam.id}_${student.classId}_${subject.id}`);
                    });
                } else { // Subject-specific exam
                    assessmentIdsToFetch.add(`${exam.id}_${student.classId}_${exam.subjectId}`);
                }
            }
        });
        
        if (assessmentIdsToFetch.size === 0) {
             return { success: false, message: "No relevant exams (AOI/EOT) found for this student's class and term." };
        }
        
        const approvedSubmissionsSnapshots: QuerySnapshot<DocumentData>[] = [];
        const assessmentIdArray = Array.from(assessmentIdsToFetch);
        const chunkSize = 30; // Firestore 'in' query limit
        for (let i = 0; i < assessmentIdArray.length; i += chunkSize) {
            const chunk = assessmentIdArray.slice(i, i + chunkSize);
            const q = query(collection(db, "markSubmissions"), where("assessmentId", "in", chunk), where("dosStatus", "==", "Approved"));
            const snapshot = await getDocs(q);
            approvedSubmissionsSnapshots.push(snapshot);
        }

        type SubjectResultTemp = {
            subjectName: string;
            teacherInitials: string;
            aoiScores: Array<{ raw: number; max: number; }>; // Store raw scores and max marks
            eotRawScore: number | null;
            eotMaxScore: number;
            finalScore: number;
            grade: string;
            descriptor: string;
        };

        const resultsBySubject = new Map<string, SubjectResultTemp>();

        approvedSubmissionsSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const submission = doc.data() as MarkSubmissionFirestoreRecord;
                const [, , subjectId] = submission.assessmentId.split('_');
                const examId = submission.assessmentId.split('_')[0];
                const exam = examsForTerm.find(e => e.id === examId);
                const subject = allSubjects.find(s => s.id === subjectId);
                const teacher = allTeachers.find(t => t.id === submission.teacherId);

                if (!subject || !exam) return;

                const studentMark = submission.submittedMarks.find(m => m.studentId === student.studentIdNumber);
                if(studentMark === undefined || studentMark.score === null) return;
                
                if (!resultsBySubject.has(subjectId)) {
                    resultsBySubject.set(subjectId, {
                        subjectName: subject.name,
                        teacherInitials: teacher?.name.split(' ').map(n => n[0]).join('') || 'N/A',
                        aoiScores: [],
                        eotRawScore: null,
                        eotMaxScore: 100, // Default, will be overwritten
                        finalScore: 0,
                        grade: '',
                        descriptor: '',
                    });
                }
                const subjectResult = resultsBySubject.get(subjectId)!;

                if (aoiExams.some(e => e.id === examId)) {
                    subjectResult.aoiScores.push({ raw: studentMark.score, max: exam.maxMarks });
                }
                if (eotExams.some(e => e.id === examId)) {
                    subjectResult.eotRawScore = studentMark.score;
                    subjectResult.eotMaxScore = exam.maxMarks;
                }
            });
        });
        
        const defaultGradingPolicy = gradingPolicies.find(p => p.isDefault) || { scale: generalSettings.defaultGradingScale || [] };
        let overallAverage = 0;
        let subjectsCounted = 0;

        const finalResults: ReportCardData['results'] = [];

        resultsBySubject.forEach((result) => {
            let aoiTotalOutOf20 = 0;
            if (result.aoiScores.length > 0) {
                const convertedAoiScores = result.aoiScores.map(s => (s.raw / s.max) * 20);
                aoiTotalOutOf20 = convertedAoiScores.reduce((sum, score) => sum + score, 0) / convertedAoiScores.length;
            }
            
            const eotScoreOutOf80 = result.eotRawScore !== null ? (result.eotRawScore / result.eotMaxScore) * 80 : 0;
            const finalScore = aoiTotalOutOf20 + eotScoreOutOf80;
            
            const grade = calculateGrade(finalScore, 100, defaultGradingPolicy.scale);
            const descriptor = getGradeDescriptor(grade);

            if(finalScore > 0) {
                overallAverage += finalScore;
                subjectsCounted++;
            }

            finalResults.push({
                subjectName: result.subjectName,
                teacherInitials: result.teacherInitials,
                aoiTotal: aoiTotalOutOf20,
                eotScore: eotScoreOutOf80,
                finalScore: finalScore,
                grade: grade,
                descriptor: descriptor
            });
        });

        const reportCardData: ReportCardData = {
            schoolDetails: {
                name: "St. Mbaaga's College",
                address: "P.O. Box 8",
                location: "Naddangira",
                phone: "0758013161 / 0782923384",
                email: "ssegawarichard7@gmail.com",
                logoUrl: "https://i.imgur.com/lZDibio.png",
                theme: '"Built for greater works." Ephesians 2:10'
            },
            student,
            term,
            class: studentClass,
            reportTitle,
            results: finalResults.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
            summary: {
                average: subjectsCounted > 0 ? overallAverage / subjectsCounted : 0,
                gradeScale: defaultGradingPolicy.scale.sort((a,b) => b.minScore - a.minScore) // Sort grades for display
            },
            comments: {
                classTeacher: "",
                headTeacher: ""
            },
            nextTerm: {
                begins: "26-May-2025",
                ends: "22-Aug-2025",
                fees: "1,025,500"
            }
        };

        return { success: true, message: "Report data generated.", data: reportCardData };

    } catch (error) {
        console.error("Error generating report card data:", error);
        return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}


// --- Data fetch functions used across the D.O.S. portal ---
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
        uid: docSnap.id, // The document ID IS the UID
        name: data.name,
        email: data.email,
        role: data.role,
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
        const classesList = classSnapshot.docs.map(classDoc => {
            const classData = classDoc.data();
            return {
                id: classDoc.id,
                name: classData.name || "Unnamed Class",
                level: classData.level || "Unknown Level",
                streams: classData.streams || [],
                classTeacherId: classData.classTeacherId === null ? undefined : classData.classTeacherId,
            } as ClassInfo;
        });
        return Promise.all(classesList);
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
                category: data.category === null ? undefined : data.category,
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
        dosWelcomeText: "Error: Could not load welcome text.",
        dosWelcomeImageUrl: undefined,
        dosGlobalAnnouncementText: "Error: System settings could not be loaded. DB uninitialized.",
        dosGlobalAnnouncementType: "warning",
        teacherDashboardResourcesText: "Error: Resources text could not be loaded. DB uninitialized.",
        teacherDashboardResourcesImageUrl: undefined,
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
                dosWelcomeText: data.dosWelcomeText === null ? undefined : data.dosWelcomeText,
                dosWelcomeImageUrl: data.dosWelcomeImageUrl === null ? undefined : data.dosWelcomeImageUrl,
                dosGlobalAnnouncementText: data.dosGlobalAnnouncementText === null ? undefined : data.dosGlobalAnnouncementText,
                dosGlobalAnnouncementType: data.dosGlobalAnnouncementType === null ? undefined : data.dosGlobalAnnouncementType,
                teacherDashboardResourcesText: data.teacherDashboardResourcesText === null ? undefined : data.teacherDashboardResourcesText,
                teacherDashboardResourcesImageUrl: data.teacherDashboardResourcesImageUrl === null ? undefined : data.teacherDashboardResourcesImageUrl,
                isDefaultTemplate: false,
            } as GeneralSettings & { isDefaultTemplate: boolean };
        }
        console.warn("[DOS Action - getGeneralSettings] 'settings/general' document does not exist. Creating with default template settings.");
        const defaultSettings: GeneralSettings & { isDefaultTemplate: boolean } = {
            defaultGradingScale: [{ grade: 'A', minScore: 80, maxScore: 100 }, { grade: 'B', minScore: 70, maxScore: 79 }],
            markSubmissionTimeZone: 'UTC',
            currentTermId: undefined,
            globalMarksSubmissionDeadline: undefined,
            dosWelcomeText: "Welcome to the D.O.S. Dashboard! You can edit this message in General Settings.",
            dosWelcomeImageUrl: "https://placehold.co/600x400.png",
            dosGlobalAnnouncementText: "Welcome to GradeCentral! Please configure system settings via the D.O.S. portal.",
            dosGlobalAnnouncementType: "info",
            teacherDashboardResourcesText: "Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. Stay updated with notifications from the D.O.S. and ensure timely submission of grades. If you encounter any issues, please contact the administration.",
            teacherDashboardResourcesImageUrl: "https://placehold.co/600x400.png",
            isDefaultTemplate: true,
        };
        await setDoc(settingsRef, {
            ...defaultSettings,
            isDefaultTemplate: undefined, // Don't save this flag to Firestore
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
            dosWelcomeText: "Error fetching welcome text.",
            dosWelcomeImageUrl: undefined,
            dosGlobalAnnouncementText: "Error fetching announcements due to a server error.",
            dosGlobalAnnouncementType: "warning",
            teacherDashboardResourcesText: "Could not load teacher resources text due to a server error. Please contact support.",
            teacherDashboardResourcesImageUrl: undefined,
            isDefaultTemplate: true,
        };
    }
}

export async function getAttendanceSummaryForDOS(classId: string, date: string): Promise<{ success: boolean; message: string; data?: DOSAttendanceSummary }> {
  if (!db) {
    return { success: false, message: "Database not initialized." };
  }
  if (!classId || !date) {
    return { success: false, message: "Class ID and date are required." };
  }

  try {
    const docId = `${classId}_${date}`;
    const attendanceRef = doc(db, "attendance", docId);
    const attendanceSnap = await getDoc(attendanceRef);

    const allStudentsInClass = await getStudents().then(students => students.filter(s => s.classId === classId));

    if (!attendanceSnap.exists()) {
      return { 
        success: true, 
        message: "No attendance record found for this date.",
        data: {
          present: 0,
          absent: 0,
          late: 0,
          totalStudents: allStudentsInClass.length,
          totalRecords: 0,
          teacherName: 'N/A',
          lastUpdatedAt: null,
          presentDetails: [],
          absentDetails: [],
          lateDetails: []
        }
      };
    }

    const record = attendanceSnap.data() as DailyAttendanceRecord;
    const studentMap = new Map(allStudentsInClass.map(s => [s.id, s]));

    const summary: DOSAttendanceSummary = {
      present: 0,
      absent: 0,
      late: 0,
      totalStudents: allStudentsInClass.length,
      totalRecords: record.records.length,
      teacherName: 'Unknown',
      lastUpdatedAt: record.lastUpdatedAt.toDate().toISOString(),
      presentDetails: [],
      absentDetails: [],
      lateDetails: []
    };
    
    if(record.teacherId) {
        const teacher = await getTeacherById(record.teacherId);
        summary.teacherName = teacher?.name || 'Unknown Teacher';
    }

    record.records.forEach(r => {
      const studentInfo = studentMap.get(r.studentId);
      const studentDetail: StudentDetail = { id: r.studentId, name: studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : "Unknown Student" };
      if (r.status === 'present') {
        summary.present++;
        summary.presentDetails.push(studentDetail);
      } else if (r.status === 'absent') {
        summary.absent++;
        summary.absentDetails.push(studentDetail);
      } else if (r.status === 'late') {
        summary.late++;
        summary.lateDetails.push(studentDetail);
      }
    });

    return { success: true, message: "Summary fetched successfully.", data: summary };

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error.";
    console.error(`Error fetching attendance summary for class ${classId} on ${date}:`, error);
    return { success: false, message: `Failed to fetch attendance summary: ${msg}` };
  }
}

export async function getStudentsForClass(classId: string): Promise<Student[]> {
    if (!db) return [];
    const q = query(collection(db, "students"), where("classId", "==", classId));
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Student))
        .sort((a, b) => a.lastName.localeCompare(b.lastName));
}
    









    

    

