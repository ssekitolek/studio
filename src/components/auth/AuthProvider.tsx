
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, limit } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  console.log(`[AuthProvider] Determining role for user: ${user.uid} (${user.email})`);
  
  if (user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.uid} identified as ADMIN by email.`);
    return 'admin';
  }

  if (!db) {
    console.error("[AuthProvider] Firestore DB is not initialized. Cannot determine role.");
    return null;
  }

  try {
    // Attempt 1: Fast lookup by document ID. Works for new users created with setDoc(doc(db, "teachers", uid)).
    const teacherRef = doc(db, "teachers", user.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      const role = teacherData.role;
      if (role === 'dos' || role === 'teacher') {
        console.log(`[AuthProvider] Role for UID ${user.uid} found via direct doc ID lookup: ${role}`);
        return role;
      }
    }
    
    // Attempt 2: Fallback query. This is crucial for older users created with addDoc() 
    // where the document ID is auto-generated and the auth UID is a field inside the document.
    console.log(`[AuthProvider] Direct lookup failed for ${user.uid}. Attempting query fallback on 'uid' field.`);
    const teachersCol = collection(db, "teachers");
    const q = query(teachersCol, where("uid", "==", user.uid), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const teacherData = userDoc.data();
        const role = teacherData.role;
        if (role === 'dos' || role === 'teacher') {
            console.log(`[AuthProvider] Role for UID ${user.uid} found via query fallback: ${role}`);
            return role;
        }
    }

    console.warn(`[AuthProvider] No teacher document found for UID ${user.uid} via direct lookup or query. This user has no role in the system.`);
    return null;

  } catch (error) {
    console.error(`[AuthProvider] Firestore error checking role for UID ${user.uid}:`, error);
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
