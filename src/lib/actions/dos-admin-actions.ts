
"use server";

import type { Teacher } from "@/lib/types";
import { authAdmin } from "@/lib/firebase-admin";

// This file contains actions that REQUIRE the Firebase Admin SDK.
// It should ONLY handle authentication-related tasks like user creation/deletion.

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
