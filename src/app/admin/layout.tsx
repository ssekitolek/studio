
'use client';

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
        <SidebarProvider defaultOpen={true}>
          <AdminSidebar />
          <SidebarInset className="flex flex-col min-h-screen">
            <AppHeader
              userName={user?.displayName || "Site Admin"}
              userEmail={user?.email}
              userRole="Admin"
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
    </ProtectedRoute>
  );
}
