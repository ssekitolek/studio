
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { adminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "mathius@admin.staff";

/**
 * Fetches a user's role and syncs it as a custom claim.
 * It now checks for a specific admin email before checking the database.
 * @param uid The Firebase Auth User ID.
 * @returns The user's role string ('admin', 'dos', 'teacher') or null.
 */
export async function getAndSyncUserRole(uid: string): Promise<string | null> {
  if (!uid) {
    console.warn("[AuthAction] getAndSyncUserRole called with invalid UID.");
    return null;
  }

  try {
    console.log(`[AuthAction] Checking role for UID: ${uid}`);
    const userRecord = await adminAuth.getUser(uid);
    const currentUserClaims = userRecord.customClaims;
    let role: string | null = null;
    
    const userEmail = userRecord.email?.trim();

    // 1. Check for Admin role by email
    if (userEmail && userEmail === ADMIN_EMAIL) {
      console.log(`[AuthAction] User ${uid} identified as ADMIN via email.`);
      role = 'admin';
    } else {
      // 2. If not admin, check for Teacher/D.O.S. role in Firestore
      console.log(`[AuthAction] User ${uid} is not admin, checking Firestore 'teachers' collection.`);
      const userDocRef = doc(db, "teachers", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log(`[AuthAction] Found Firestore doc for ${uid} with role: ${userData.role}`);
        // Ensure the role from Firestore is either 'dos' or 'teacher'
        if (userData.role === 'dos' || userData.role === 'teacher') {
            role = userData.role;
        } else {
            console.warn(`[AuthAction] User ${uid} has an invalid role in Firestore: '${userData.role}'`);
        }
      } else {
          console.log(`[AuthAction] No Firestore document found for user ${uid} in 'teachers' collection.`);
      }
    }

    // 3. Sync the determined role to custom claims if it's different
    if (role) {
      if (currentUserClaims?.role !== role) {
        console.log(`[AuthAction] Syncing role for UID ${uid}. Old role: ${currentUserClaims?.role}, New role: ${role}`);
        await adminAuth.setCustomUserClaims(uid, { ...currentUserClaims, role });
      } else {
         console.log(`[AuthAction] Role for UID ${uid} is already synced as '${role}'. No update needed.`);
      }
      console.log(`[AuthAction] Returning role '${role}' for UID ${uid}.`);
      return role;
    }
    
    // If no role was determined, return null
    console.warn(`[AuthAction] No valid role ('admin', 'dos', 'teacher') found for user ${uid} (${userRecord.email}). Returning null.`);
    return null;

  } catch (error) {
    console.error(`[AuthAction] CRITICAL ERROR in getAndSyncUserRole for UID ${uid}:`, error);
    return null;
  }
}
