
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, getDoc, DocumentSnapshot } from "firebase/firestore";
import { adminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "mathius@admin.staff";

/**
 * Fetches a user's role from Firestore and syncs it as a custom claim in Firebase Auth.
 * This function is now robust and backward-compatible.
 * @param uid The Firebase Auth User ID.
 * @returns The user's role string ('admin', 'dos', 'teacher') or null if no valid role is found.
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

    // 1. Check for Admin role by email FIRST. This is the highest privilege.
    if (userEmail && userEmail === ADMIN_EMAIL) {
      console.log(`[AuthAction] User ${uid} identified as ADMIN via email.`);
      role = 'admin';
    } else {
      // 2. If not admin, check for Teacher/D.O.S. role in Firestore
      console.log(`[AuthAction] User ${uid} is not admin. Querying 'teachers' collection.`);

      // Attempt to find user document by querying the 'uid' field.
      // This is the most robust method and supports users created with addDoc (random ID) or setDoc(uid).
      const teachersRef = collection(db, "teachers");
      const q = query(teachersRef, where("uid", "==", uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      let userDocSnap: DocumentSnapshot | null = null;

      if (!querySnapshot.empty) {
        userDocSnap = querySnapshot.docs[0];
        console.log(`[AuthAction] Found teacher document via query: ${userDocSnap.id}`);
      } else {
        // As a fallback, try to get the document where the ID is the UID.
        // This handles cases where the 'uid' field might be missing but the doc ID is correct.
        console.log(`[AuthAction] No teacher found via query. Falling back to getDoc(uid).`);
        const teacherDocRef = doc(db, "teachers", uid);
        const docByIdSnap = await getDoc(teacherDocRef);
        if (docByIdSnap.exists()) {
          userDocSnap = docByIdSnap;
          console.log(`[AuthAction] Found teacher document via getDoc(uid): ${userDocSnap.id}`);
        }
      }

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // Default to 'teacher' if role is missing, empty, or invalid.
        role = userData.role === 'dos' ? 'dos' : 'teacher'; 
        console.log(`[AuthAction] Determined role for ${uid} as: ${role}`);
      } else {
        console.log(`[AuthAction] No Firestore document found for user ${uid} in 'teachers' collection by any method.`);
      }
    }

    // 3. Sync the determined role to custom claims if it's different
    if (role) {
      if (currentUserClaims?.role !== role) {
        console.log(`[AuthAction] Syncing role for UID ${uid}. Old claim: ${currentUserClaims?.role}, New role: ${role}`);
        await adminAuth.setCustomUserClaims(uid, { role }); // Overwrite claims with just the role
      } else {
         console.log(`[AuthAction] Role for UID ${uid} is already synced as '${role}'. No update needed.`);
      }
      console.log(`[AuthAction] Returning role '${role}' for UID ${uid}.`);
      return role;
    }
    
    // If no role was determined, return null
    console.warn(`[AuthAction] No valid role ('admin', 'dos', 'teacher') found for user ${uid} (${userRecord.email}). Returning null.`);
    // IMPORTANT: If a role was previously set but is now invalid (e.g., user deleted from 'teachers' collection), we should clear it.
    if (currentUserClaims?.role) {
        console.warn(`[AuthAction] Clearing stale role claim for user ${uid}`);
        await adminAuth.setCustomUserClaims(uid, {});
    }
    return null;

  } catch (error) {
    console.error(`[AuthAction] CRITICAL ERROR in getAndSyncUserRole for UID ${uid}:`, error);
    return null;
  }
}
