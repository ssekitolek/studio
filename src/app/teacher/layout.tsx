
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation'; 

export default async function TeacherLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: { teacherId?: string; teacherName?: string };
}) {
  // Server-side log to check what searchParams are received
  console.log('[TeacherLayout] Received searchParams:', searchParams);

  const teacherId = searchParams?.teacherId;
  let teacherName = searchParams?.teacherName ? decodeURIComponent(searchParams.teacherName) : "Teacher";

  if (!teacherId) {
    console.warn('[TeacherLayout] teacherId is missing from searchParams. Redirecting to /login/teacher. Current searchParams:', searchParams);
    redirect('/login/teacher');
  }

  // If teacherId is present, log it for confirmation
  console.log(`[TeacherLayout] Proceeding with teacherId: ${teacherId}, teacherName: ${teacherName}`);

  return (
    <SidebarProvider defaultOpen={true}>
        <TeacherSidebar teacherIdParam={teacherId} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader userName={teacherName} userRole="Teacher" />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}

    