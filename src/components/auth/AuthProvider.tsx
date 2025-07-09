'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

// --- Logic from auth-actions.ts has been moved directly into this component for reliability ---
const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  // 1. Check for Admin role by the hardcoded email. This is the fastest and most reliable check.
  if (user.email && user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.uid} identified as ADMIN via email.`);
    return 'admin';
  }

  // 2. If not admin, check Firestore for a 'teacher' or 'dos' role.
  try {
    // The document ID in the 'teachers' collection IS the user's UID.
    const teacherRef = doc(db, "teachers", user.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      // Securely default to 'teacher' if the role field is missing or invalid.
      const role = teacherData.role === 'dos' ? 'dos' : 'teacher';
      console.log(`[AuthProvider] Role for UID ${user.uid} found in Firestore: ${role}`);
      return role;
    } else {
      // This is expected for the admin user, but a problem for any other user.
      console.warn(`[AuthProvider] No Firestore document found for teacher with UID: ${user.uid}. Cannot determine role from database.`);
      return null;
    }
  } catch (error) {
    // This catch block will trigger if Firestore rules deny the read.
    console.error(`[AuthProvider] CRITICAL ERROR checking role for UID ${user.uid}:`, error);
    return null;
  }
}
// --- End of moved logic ---


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
