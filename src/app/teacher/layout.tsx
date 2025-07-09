
"use server";

import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
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

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <SidebarProvider defaultOpen={true}>
      <TeacherSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader
          userName={user?.name || user?.email}
          userEmail={user?.email}
          userRole="Teacher"
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
