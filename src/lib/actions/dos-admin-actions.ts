
"use server";

import type { Teacher } from "@/lib/types";
import { getAuth } from "firebase-admin/auth";
import { app } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

// This file contains actions that REQUIRE the Firebase Admin SDK.
// They should only be imported into components that are themselves server-side
// or in API routes, to avoid bundling admin credentials on the client.

const authAdmin = getAuth(app);

export async function createTeacherWithRole(teacherData: Omit<Teacher, 'id' | 'subjectsAssigned'> & { password: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  try {
    const { email, password, name, role } = teacherData;
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

export async function updateTeacherWithRole(teacherId: string, teacherData: Partial<Omit<Teacher, 'id' | 'subjectsAssigned'>> & { password?: string }): Promise<{ success: boolean; message: string; teacher?: Partial<Teacher> }> {
  try {
    const { name, email, password, role } = teacherData;
    const authUpdatePayload: { displayName?: string; email?: string; password?: string } = {};
    if (name) authUpdatePayload.displayName = name;
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;

    if (Object.keys(authUpdatePayload).length > 0) {
      await authAdmin.updateUser(teacherId, authUpdatePayload);
    }
    
    const firestoreUpdatePayload: { name?: string; email?: string; role?: 'teacher' | 'dos' } = {};
    if (name) firestoreUpdatePayload.name = name;
    if (email) firestoreUpdatePayload.email = email;
    if (role) firestoreUpdatePayload.role = role;
    
    if (Object.keys(firestoreUpdatePayload).length > 0) {
      const teacherDocRef = doc(db, "teachers", teacherId);
      await setDoc(teacherDocRef, firestoreUpdatePayload, { merge: true });
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
