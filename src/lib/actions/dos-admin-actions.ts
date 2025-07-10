
"use server";

import type { Teacher } from "@/lib/types";
import { getAuth } from "firebase-admin/auth";
import { app } from "@/lib/firebase-admin";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Ensure the admin app is initialized
const adminApp = app;
const authAdmin = getAuth(adminApp);

export async function createTeacherWithRole(teacherData: Omit<Teacher, 'id'> & { password?: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  try {
    const { email, password, name, role } = teacherData;
    if (!password) {
        return { success: false, message: "Password is required to create a new teacher." };
    }
    const userRecord = await authAdmin.createUser({ email, password, displayName: name });
    const teacherDocRef = doc(db, "teachers", userRecord.uid);
    const teacherPayload = {
      uid: userRecord.uid,
      name,
      email,
      role,
      subjectsAssigned: [],
    };
    await setDoc(teacherDocRef, teacherPayload);
    await authAdmin.setCustomUserClaims(userRecord.uid, { role });
    
    return { success: true, message: "Teacher account created successfully.", teacher: { id: userRecord.uid, ...teacherPayload } };
  } catch (error: any) {
    const message = error.code === 'auth/email-already-exists' ? 'This email is already in use.' : error.message || 'An unexpected error occurred.';
    return { success: false, message };
  }
}

export async function updateTeacherWithRole(teacherId: string, teacherData: Partial<Omit<Teacher, 'id'>> & { password?: string }): Promise<{ success: boolean; message: string; teacher?: Partial<Teacher> }> {
  try {
    const { name, email, password, role } = teacherData;
    const authUpdatePayload: { displayName?: string; email?: string; password?: string } = {};
    if (name) authUpdatePayload.displayName = name;
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;

    if (Object.keys(authUpdatePayload).length > 0) {
      await authAdmin.updateUser(teacherId, authUpdatePayload);
    }
    
    const firestoreUpdatePayload: { name?: string; email?: string; role?: string } = {};
    if (name) firestoreUpdatePayload.name = name;
    if (email) firestoreUpdatePayload.email = email;
    if (role) firestoreUpdatePayload.role = role;
    
    if (Object.keys(firestoreUpdatePayload).length > 0) {
      const teacherDocRef = doc(db, "teachers", teacherId);
      await updateDoc(teacherDocRef, firestoreUpdatePayload);
    }

    if(role){
      await authAdmin.setCustomUserClaims(teacherId, { role });
    }
    
    return { success: true, message: "Teacher account updated successfully.", teacher: teacherData };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteTeacherWithRole(teacherId: string): Promise<{ success: boolean; message: string }> {
  try {
    await authAdmin.deleteUser(teacherId);
    const teacherDocRef = doc(db, "teachers", teacherId);
    await deleteDoc(teacherDocRef);
    
    return { success: true, message: "Teacher account and data deleted successfully." };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
