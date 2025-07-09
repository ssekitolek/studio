
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  console.log(`[AuthProvider] Determining role for user: ${user.uid} (${user.email})`);
  
  // 1. Admin check (highest priority)
  if (user.email && user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.uid} identified as ADMIN by email.`);
    return 'admin';
  }

  if (!db) {
    console.error("[AuthProvider] Firestore DB is not initialized. Cannot determine role.");
    return null;
  }

  try {
    // 2. Primary check: Firestore document ID matches UID. This is the ideal state.
    const teacherRefByUid = doc(db, "teachers", user.uid);
    const teacherSnapByUid = await getDoc(teacherRefByUid);

    if (teacherSnapByUid.exists()) {
      const teacherData = teacherSnapByUid.data();
      const role = teacherData.role === 'dos' ? 'dos' : 'teacher';
      console.log(`[AuthProvider] Role for UID ${user.uid} found via direct UID document lookup: ${role}`);
      return role;
    }

    // 3. Fallback check: If no doc by UID, query by email. This handles legacy or inconsistently created users.
    console.warn(`[AuthProvider] No teacher document found for UID ${user.uid}. Attempting fallback query by email: ${user.email}`);
    const teachersCol = collection(db, "teachers");
    const q = query(teachersCol, where("email", "==", user.email), limit(1));
    const teacherSnapByEmail = await getDocs(q);

    if (!teacherSnapByEmail.empty) {
      const teacherDoc = teacherSnapByEmail.docs[0];
      const teacherData = teacherDoc.data();
      const role = teacherData.role === 'dos' ? 'dos' : 'teacher';
      console.log(`[AuthProvider] Role for UID ${user.uid} found via EMAIL fallback lookup (Doc ID: ${teacherDoc.id}): ${role}`);
      // Future enhancement: We could trigger a server action here to "heal" the data by syncing the doc ID with the UID.
      return role;
    }
    
    // 4. If all checks fail, the user has no role defined in the system.
    console.error(`[AuthProvider] CRITICAL: Authenticated user ${user.uid} (${user.email}) has no corresponding document in 'teachers' collection by UID or email. They have no role.`);
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
