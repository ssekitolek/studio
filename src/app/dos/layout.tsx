
"use server";

import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DosSidebar } from "@/components/layout/DosSidebar";
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

export default async function DosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <SidebarProvider defaultOpen={true}>
      <DosSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader
          userName={user?.name || "D.O.S."}
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
