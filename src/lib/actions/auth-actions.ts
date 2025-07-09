
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
    return null;
  }

  try {
    // Get user details from Firebase Auth to check email and existing claims
    const userRecord = await adminAuth.getUser(uid);
    const currentUserClaims = userRecord.customClaims;
    let role: string | null = null;

    // 1. Check for Admin role by email
    if (userRecord.email === ADMIN_EMAIL) {
      role = 'admin';
    } else {
      // 2. If not admin, check for Teacher/D.O.S. role in Firestore
      const userDocRef = doc(db, "teachers", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // Ensure the role from Firestore is either 'dos' or 'teacher'
        if (userData.role === 'dos' || userData.role === 'teacher') {
            role = userData.role;
        }
      }
    }

    // 3. Sync the determined role to custom claims if it's different
    if (role) {
      if (!currentUserClaims || currentUserClaims.role !== role) {
        console.log(`Syncing role for UID ${uid}. Old role: ${currentUserClaims?.role}, New role: ${role}`);
        await adminAuth.setCustomUserClaims(uid, { ...currentUserClaims, role });
      }
      return role;
    }
    
    // If no role was determined, return null
    console.warn(`No valid role ('admin', 'dos', 'teacher') found for user ${uid} (${userRecord.email}).`);
    return null;

  } catch (error) {
    console.error(`Error getting/syncing role for UID ${uid}:`, error);
    return null;
  }
}
