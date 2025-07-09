
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const ADMIN_EMAIL = "mathius@admin.staff";

/**
 * THIS IS A CLIENT-SIDE-COMPATIBLE FUNCTION.
 * It is intended to be called from a client component (like AuthProvider).
 * It determines the user's role by checking their email for admin status,
 * or by reading their document from Firestore.
 * This avoids server-side Admin SDK issues.
 * 
 * @param uid The Firebase Auth User ID.
 * @param email The user's email address.
 * @returns The user's role ('admin', 'dos', 'teacher') or null.
 */
export async function getClientUserRole(uid: string, email: string | null): Promise<string | null> {
  if (!uid) {
    console.warn("[AuthAction] getClientUserRole called with invalid UID.");
    return null;
  }
  
  // 1. Check for Admin role by email first. This is the simplest check.
  if (email && email === ADMIN_EMAIL) {
    console.log(`[AuthAction] User ${uid} identified as ADMIN via email.`);
    return 'admin';
  }

  // 2. If not admin, check for Teacher/D.O.S. role in Firestore.
  // This requires Firestore rules to allow the logged-in user to read their own document.
  try {
    const teacherRef = doc(db, "teachers", uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      // Default to 'teacher' if role is missing, empty, or invalid.
      const role = teacherData.role === 'dos' ? 'dos' : 'teacher';
      console.log(`[AuthAction] Role for UID ${uid} found in Firestore: ${role}`);
      return role;
    } else {
      console.warn(`[AuthAction] No Firestore document found for teacher with UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error(`[AuthAction] CRITICAL ERROR in getClientUserRole for UID ${uid}:`, error);
    return null;
  }
}
