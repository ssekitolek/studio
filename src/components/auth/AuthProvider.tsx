
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { createTeacherWithRole } from '@/lib/actions/dos-actions';

const ADMIN_EMAIL = "mathius@admin.staff";
const DOS_EMAIL = "root@adminmathius.staff";

async function determineUserRole(user: User): Promise<string | null> {
  console.log(`[AuthProvider] Determining role for user: ${user.email}`);
  if (user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.email} is ADMIN.`);
    return 'admin';
  }

  // Special handling for the main D.O.S. account to ensure it exists.
  if (user.email === DOS_EMAIL) {
    console.log(`[AuthProvider] Main D.O.S. email detected: ${user.email}. Verifying account...`);
    const userDocRefById = doc(db, "teachers", user.uid);
    const userDocSnapById = await getDoc(userDocRefById);

    if (userDocSnapById.exists()) {
      const userData = userDocSnapById.data();
      if (userData.role === 'dos') {
        console.log(`[AuthProvider] D.O.S. account verified for UID ${user.uid}. Role: 'dos'`);
        return 'dos';
      }
    }
    
    // If we reach here, the user is authenticated but their Firestore record is missing or incorrect.
    // Let's create it to ensure access. This is a self-healing mechanism for the main D.O.S.
    console.warn(`[AuthProvider] D.O.S. record not found or role incorrect for UID ${user.uid}. Attempting to create/fix it.`);
    try {
        const dosPayload = {
            uid: user.uid,
            name: "Director of Studies",
            email: DOS_EMAIL,
            role: 'dos' as const,
            subjectsAssigned: [],
        };
        await setDoc(userDocRefById, dosPayload);
        console.log(`[AuthProvider] Successfully created/repaired D.O.S. record in Firestore for UID ${user.uid}.`);
        return 'dos';
    } catch(error) {
        console.error(`[AuthProvider] CRITICAL ERROR: Failed to create D.O.S. Firestore record for UID ${user.uid}:`, error);
        return null; // Deny access if we can't even fix the record.
    }
  }


  if (!db) {
    console.error("[AuthProvider] Firestore DB is not initialized. Cannot determine role.");
    return null;
  }

  try {
    const userDocRefById = doc(db, "teachers", user.uid);
    const userDocSnapById = await getDoc(userDocRefById);

    if (userDocSnapById.exists()) {
      const userData = userDocSnapById.data();
      if (userData.role === 'dos' || userData.role === 'teacher') {
        console.log(`[AuthProvider] Role found for UID ${user.uid} via direct ID lookup: ${userData.role}`);
        return userData.role;
      }
    }

    console.log(`[AuthProvider] No role found for UID ${user.uid} by ID. Falling back to email query for ${user.email}.`);
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("email", "==", user.email), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.role === 'dos' || userData.role === 'teacher') {
        console.log(`[AuthProvider] Role found for email ${user.email} via query: ${userData.role}`);
        return userData.role;
      }
    }

    console.warn(`[AuthProvider] No valid 'dos' or 'teacher' role found for user ${user.email} (UID: ${user.uid}) after all checks.`);
    return null; 

  } catch (error) {
    console.error(`[AuthProvider] Error determining user role for ${user.email}:`, error);
    return null;
  }
}


interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    console.log("[AuthProvider] Mounting and setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(`[AuthProvider] onAuthStateChanged triggered. User: ${user?.email || 'null'}`);
      if (user) {
        setUser(user);
        const userRole = await determineUserRole(user);
        console.log(`[AuthProvider] Role determined for ${user.email}: ${userRole}`);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
        console.log("[AuthProvider] User is signed out. Resetting state.");
      }
      setLoading(false);
      console.log("[AuthProvider] Auth state processing finished. Loading is now false.");
    });

    return () => {
      console.log("[AuthProvider] Unmounting and cleaning up listener.");
      unsubscribe();
    };
  }, []);

  const value = { user, loading, role };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
