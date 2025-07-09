
'use client';

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DosSidebar } from "@/components/layout/DosSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

export default function DosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="dos">
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
    </ProtectedRoute>
  );
}
