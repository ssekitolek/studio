
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  console.log(`[AuthProvider] Role check initiated for user: ${user.uid} (${user.email})`);

  if (user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] SUCCESS (Method: Email): User ${user.uid} is ADMIN.`);
    return 'admin';
  }

  if (!db) {
    console.error("[AuthProvider] FATAL: Firestore DB is not initialized. Cannot determine role.");
    return null;
  }

  try {
    // PREFERRED METHOD: Direct lookup on doc ID. This is fast and works for all new users.
    const directDocRef = doc(db, "teachers", user.uid);
    console.log(`[AuthProvider] Attempting direct lookup on doc ID: "${user.uid}"`);
    const directDocSnap = await getDoc(directDocRef);

    if (directDocSnap.exists()) {
      const teacherData = directDocSnap.data();
      const role = teacherData.role;
      if (role === 'dos' || role === 'teacher') {
        console.log(`[AuthProvider] SUCCESS (Direct Lookup): Role for UID ${user.uid} is "${role}".`);
        return role;
      }
    }
    console.log(`[AuthProvider] Direct lookup failed or role was invalid. Trying fallback query.`);
    
    // FALLBACK METHOD: Query for the user's UID in the 'uid' field. This works for older users.
    const teachersColRef = collection(db, "teachers");
    const q = query(teachersColRef, where("uid", "==", user.uid), limit(1));
    console.log(`[AuthProvider] Attempting fallback query where 'uid' field == "${user.uid}"`);
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const teacherData = userDoc.data();
      const role = teacherData.role;
      if (role === 'dos' || role === 'teacher') {
        console.log(`[AuthProvider] SUCCESS (Fallback Query): Role for UID ${user.uid} is "${role}" (found in doc ID ${userDoc.id}).`);
        
        // SELF-HEALING NOTICE: If the doc ID is different from the UID, we just log it. We don't write to avoid permissions issues.
        if (userDoc.id !== user.uid) {
            console.log(`[AuthProvider] Self-Healing Notice: User ${user.uid} has a legacy document structure (doc ID ${userDoc.id}). Login is successful.`);
        }
        return role;

      } else {
        console.warn(`[AuthProvider] WARNING (Fallback Query): Document found for UID ${user.uid} but role is invalid: "${role}".`);
      }
    }
    
    console.warn(`[AuthProvider] FAILED: No role document found for UID ${user.uid} after all checks.`);
    return null;

  } catch (error) {
    console.error(`[AuthProvider] FATAL (Firestore Error): An error occurred during role lookup for UID ${user.uid}. This is likely a Firestore Security Rules issue.`, error);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userRole = await determineUserRole(user);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
