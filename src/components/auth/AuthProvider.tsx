
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
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
    const teacherRef = doc(db, "teachers", user.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      const role = teacherData.role;
      if (role === 'dos' || role === 'teacher') {
        console.log(`[AuthProvider] Role for UID ${user.uid} found: ${role}`);
        return role;
      } else {
        console.warn(`[AuthProvider] User document found for ${user.uid}, but role is missing or invalid: '${role}'`);
        return null;
      }
    } else {
      console.warn(`[AuthProvider] No teacher document found for UID ${user.uid}. This user has no role in the system.`);
      return null;
    }
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
