
"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * Fetches a user's role from their Firestore document and syncs it
 * as a custom claim in Firebase Auth. This is a self-healing mechanism
 * for users who may not have a role claim set in their auth token yet.
 * @param uid The Firebase Auth User ID.
 * @returns The user's role string or null if not found.
 */
export async function getAndSyncUserRole(uid: string): Promise<string | null> {
  if (!uid) {
    return null;
  }
  try {
    const userDocRef = doc(db, "teachers", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const role = userData.role as string | undefined;

      if (role) {
        // Role found in Firestore, let's sync it to Auth custom claims
        // to make future lookups faster and more secure.
        const currentUserClaims = (await adminAuth.getUser(uid)).customClaims;
        if (!currentUserClaims || currentUserClaims.role !== role) {
           await adminAuth.setCustomUserClaims(uid, { ...currentUserClaims, role });
        }
        return role;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error getting/syncing role for UID ${uid}:`, error);
    return null;
  }
}
