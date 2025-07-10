
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = "mathius@admin.staff";

async function determineUserRole(user: User): Promise<string | null> {
  if (user.email === ADMIN_EMAIL) {
    console.log(`[AuthProvider] User ${user.email} is ADMIN.`);
    return 'admin';
  }

  if (!db) {
    console.error("[AuthProvider] Firestore DB is not initialized. Cannot determine role.");
    return null;
  }

  try {
    // Primary Method: Look for a document in 'teachers' collection with the user's UID as the ID.
    // This is the standard for users created via the D.O.S. portal.
    const userDocRefById = doc(db, "teachers", user.uid);
    const userDocSnapById = await getDoc(userDocRefById);

    if (userDocSnapById.exists()) {
      const userData = userDocSnapById.data();
      if (userData.role === 'dos' || userData.role === 'teacher') {
        console.log(`[AuthProvider] Role found for UID ${user.uid} via direct ID lookup: ${userData.role}`);
        return userData.role;
      }
    }

    // Fallback Method: If no doc found by ID (for older/manually created users),
    // query the 'teachers' collection for a document where the 'email' field matches.
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
    return null; // Explicitly return null if no role is found

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
      setLoading(true);
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
