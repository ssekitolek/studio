
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  // 1. Admin check is the highest priority and fastest check.
  if (user.email && user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.uid} identified as ADMIN via email.`);
    return 'admin';
  }

  // 2. If not admin, check Firestore for a role.
  try {
    // The document ID in the 'teachers' collection IS the user's UID.
    const teacherRef = doc(db, "teachers", user.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      // Role exists, return it. Default to 'teacher' if the role field is missing or invalid.
      const role = teacherData.role === 'dos' ? 'dos' : 'teacher';
      console.log(`[AuthProvider] Role for UID ${user.uid} found in Firestore: ${role}`);
      return role;
    } else {
      // THIS IS THE KEY: The user is authenticated but has no role document.
      // This is an invalid state for a non-admin user. Return null so the
      // layout's protection logic can handle the redirect gracefully.
      console.warn(`[AuthProvider] CRITICAL: Authenticated user ${user.uid} (${user.email}) has no corresponding document in the 'teachers' collection. They have no role and will be denied access to protected routes.`);
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
