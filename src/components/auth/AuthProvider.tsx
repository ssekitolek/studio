
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
    // --- Method 1: Direct Document ID Lookup (for new users) ---
    console.log(`[AuthProvider] Attempting Method 1: Direct lookup for doc ID "${user.uid}"...`);
    const teacherRef = doc(db, "teachers", user.uid);
    const teacherSnap = await getDoc(teacherRef);

    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.data();
      const role = teacherData.role;
      if (role === 'dos' || role === 'teacher') {
        console.log(`[AuthProvider] SUCCESS (Method: Direct): Role for UID ${user.uid} is "${role}".`);
        return role;
      }
    }
    console.log(`[AuthProvider] INFO (Method: Direct): No document found with ID matching user's UID. This is expected for older accounts.`);

    // --- Method 2: Fallback Query (for old users created with auto-ID) ---
    console.log(`[AuthProvider] Attempting Method 2: Fallback query where 'uid' field == "${user.uid}"...`);
    const teachersCol = collection(db, "teachers");
    const q = query(teachersCol, where("uid", "==", user.uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const teacherData = userDoc.data();
        const role = teacherData.role;
        if (role === 'dos' || role === 'teacher') {
            console.log(`[AuthProvider] SUCCESS (Method: Fallback): Role for UID ${user.uid} is "${role}" (found in doc ID ${userDoc.id}).`);
            return role;
        }
    }
    console.log(`[AuthProvider] INFO (Method: Fallback): No document found with a 'uid' field matching the user's UID.`);
    
    // --- Final Result: No Role Found ---
    console.warn(`[AuthProvider] FAILED: No role found for UID ${user.uid} after checking all methods. User will be denied access to protected portals.`);
    return null;

  } catch (error) {
    console.error(`[AuthProvider] FATAL (Firestore Error): An error occurred during role lookup for UID ${user.uid}. This may be a permissions issue in your Firestore security rules.`, error);
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
