
'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { DosSidebar } from "@/components/layout/DosSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait for the auth state to be determined.
    }

    // If loading is complete, and there's no user, redirect to login.
    if (!user) {
      router.replace('/login/dos');
      return;
    }

    // If the user's role is not 'dos', they don't belong here.
    if (role !== 'dos') {
      // Redirect them to their correct dashboard.
      if (role === 'teacher') router.replace('/teacher/dashboard');
      else if (role === 'admin') router.replace('/admin/dashboard');
      else { // If they have no role or an unexpected one, send to home.
        router.replace('/'); 
      }
    }
  }, [user, loading, role, router]);

  // While loading, or if the user is not the correct role, show a loader.
  if (loading || !user || role !== 'dos') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If all checks pass, render the layout for the D.O.S.
  return (
    <SidebarProvider defaultOpen={true}>
      <DosSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader
          userName={user?.displayName || "D.O.S."}
          userEmail={user?.email}
          userRole="D.O.S."
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
