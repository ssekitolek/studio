
"use server";

import type { Teacher } from "@/lib/types";
import { authAdmin } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

// This file contains actions that REQUIRE the Firebase Admin SDK.
// It should ONLY handle authentication-related tasks like user creation/deletion.

export async function createTeacherWithRole(teacherData: Omit<Teacher, 'id' | 'subjectsAssigned'> & { password: string }): Promise<{ success: boolean; message: string; teacher?: Teacher }> {
  try {
    const { email, password, name, role } = teacherData;
    
    // Check if user with that email already exists in Firebase Auth
    try {
        await authAdmin.getUserByEmail(email);
        return { success: false, message: `An account with the email ${email} already exists.` };
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            throw error; // Re-throw unexpected errors
        }
        // If user is not found, we can proceed with creation
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
    const message = error.message || 'An unexpected error occurred.';
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


export async function deleteTeacherWithRole(uid: string): Promise<{ success: boolean; message: string }> {
  try {
    await authAdmin.deleteUser(uid);
    console.log(`Successfully deleted user with UID: ${uid} from Firebase Auth.`);
    return { success: true, message: "Teacher account deleted from authentication successfully." };
  } catch (error: any) {
    const message = error.code === 'auth/user-not-found' 
      ? "User not found in Authentication, but proceeding to delete from database."
      : error.message || 'An unexpected error occurred during auth deletion.';
    
    if (error.code === 'auth/user-not-found') {
      console.warn(`User with UID ${uid} not found in Firebase Auth. It might have been deleted already.`);
      return { success: true, message: "User was not found in authentication (might be already deleted)." };
    }
    
    console.error("Error in deleteTeacherWithRole (Firebase Auth):", error);
    return { success: false, message: `Auth deletion failed: ${message}` };
  }
}

export async function deleteTeacherDoc(teacherId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore is not initialized." };
  }
  try {
    await deleteDoc(doc(db, "teachers", teacherId));
    revalidatePath("/dos/teachers");
    return { success: true, message: "Teacher database record deleted successfully." };
  } catch (error) {
    console.error(`Error in deleteTeacherDoc for ${teacherId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to delete teacher from database: ${errorMessage}` };
  }
}
