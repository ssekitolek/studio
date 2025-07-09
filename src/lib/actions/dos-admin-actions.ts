
"use server";

import { adminAuth } from '@/lib/firebase-admin';
import { db } from "@/lib/firebase";
import { doc, setDoc, writeBatch, query, collection, where, getDocs, updateDoc } from "firebase/firestore";
import type { Teacher } from "@/lib/types";
import { revalidatePath } from 'next/cache';
import { getTeacherById } from './dos-actions';

export async function createTeacher(teacherData: Omit<Teacher, 'id' | 'subjectsAssigned'>): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
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
    
    // Set custom claims for the new user for modern, fast role checking
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: teacherData.role });

    // 2. Create teacher document in Firestore with the Auth UID
    const teacherPayload: Omit<Teacher, 'id' | 'password'> = {
      uid: userRecord.uid,
      name: teacherData.name,
      email: teacherData.email,
      role: teacherData.role,
      subjectsAssigned: [], // Initialize with empty array
    };
    
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
    if (teacherData.role !== undefined) firestoreUpdatePayload.role = teacherData.role;
    
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

    // Update custom claims if role has changed
    if (teacherData.role) {
      await adminAuth.setCustomUserClaims(teacherId, { role: teacherData.role });
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
