
"use server";

import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { adminAuth } from "@/lib/firebase-admin";

async function getUser() {
  const sessionCookie = cookies().get("__session")?.value;
  if (!sessionCookie) {
    return null;
  }
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader
          userName={user?.name || "Site Admin"}
          userEmail={user?.email}
          userRole="Admin"
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
