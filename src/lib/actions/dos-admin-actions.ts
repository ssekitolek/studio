
"use server";

import type { Teacher } from "@/lib/types";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin"; // Correctly import the initialized admin app and services
import { doc, setDoc, deleteDoc } from "firebase/firestore";

// This file contains actions that REQUIRE the Firebase Admin SDK.
// They should only be imported into components that are themselves server-side
// or in API routes, to avoid bundling admin credentials on the client.

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
    const teacherDocRef = doc(dbAdmin, "teachers", userRecord.uid);
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
      const teacherDocRef = doc(dbAdmin, "teachers", teacherId);
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
    const teacherDocRef = doc(dbAdmin, "teachers", teacherId);
    
    // Start with Auth deletion. If this fails, Firestore won't be touched.
    await authAdmin.deleteUser(teacherId);
    
    // Then delete from Firestore.
    await deleteDoc(teacherDocRef);
    
    console.log(`Successfully deleted teacher ${teacherId} from Auth and Firestore.`);
    return { success: true, message: "Teacher account and data deleted successfully." };
  } catch (error: any) {
    const message = error.code === 'auth/user-not-found' 
      ? "User may have already been deleted from Authentication. Check Firestore."
      : error.message || 'An unexpected error occurred.';
    console.error("Error in deleteTeacherWithRole:", error);
    return { success: false, message: `Deletion failed: ${message}` };
  }
}
