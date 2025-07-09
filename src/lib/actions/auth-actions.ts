
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, getDoc, DocumentSnapshot, updateDoc } from "firebase/firestore";
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
      // 2. If not admin, check for Teacher/D.O.S. role in Firestore using multiple methods for reliability.
      console.log(`[AuthAction] User ${uid} is not admin. Querying 'teachers' collection.`);
      const teachersRef = collection(db, "teachers");
      let userDocSnap: DocumentSnapshot | null = null;

      // Method 1: Query by 'uid' field. Most reliable for new users.
      const qByUid = query(teachersRef, where("uid", "==", uid), limit(1));
      const uidSnapshot = await getDocs(qByUid);
      if (!uidSnapshot.empty) {
        userDocSnap = uidSnapshot.docs[0];
        console.log(`[AuthAction] Found teacher document via query(uid): ${userDocSnap.id}`);
      }

      // Method 2: Fallback to get doc by ID, if doc ID is the UID.
      if (!userDocSnap) {
        console.log(`[AuthAction] No teacher found via query(uid). Falling back to getDoc(uid).`);
        const teacherDocRef = doc(db, "teachers", uid);
        const docByIdSnap = await getDoc(teacherDocRef);
        if (docByIdSnap.exists()) {
          userDocSnap = docByIdSnap;
          console.log(`[AuthAction] Found teacher document via getDoc(uid): ${userDocSnap.id}`);
        }
      }

      // Method 3: Final fallback to query by email. Catches legacy data where UID was not stored.
      if (!userDocSnap && userEmail) {
        console.log(`[AuthAction] No teacher found by UID. Falling back to query(email).`);
        const qByEmail = query(teachersRef, where("email", "==", userEmail), limit(1));
        const emailSnapshot = await getDocs(qByEmail);
        if (!emailSnapshot.empty) {
          userDocSnap = emailSnapshot.docs[0];
          console.log(`[AuthAction] Found teacher document via query(email): ${userDocSnap.id}`);
        }
      }

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // Default to 'teacher' if role is missing, empty, or invalid.
        role = userData.role === 'dos' ? 'dos' : 'teacher'; 
        console.log(`[AuthAction] Determined role for ${uid} as: ${role}`);
        
        // Self-healing: If the 'uid' field is missing, add it for future lookups.
        if (!userData.uid) {
            console.log(`[AuthAction] Self-healing: Adding missing 'uid' field to teacher document ${userDocSnap.id}.`);
            await updateDoc(userDocSnap.ref, { uid: uid });
        }

      } else {
        console.log(`[AuthAction] No Firestore document found for user ${uid} in 'teachers' collection by any method.`);
      }
    }

    // 3. Sync the determined role to custom claims if it's different from the current one.
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
    
    // If no role was determined, this user has no valid role in the system.
    console.warn(`[AuthAction] No valid role ('admin', 'dos', 'teacher') found for user ${uid} (${userRecord.email}). Returning null.`);
    
    // Clear any stale role from claims if it exists.
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
