
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
  const teacherId = searchParams?.teacherId;
  let teacherName = searchParams?.teacherName ? decodeURIComponent(searchParams.teacherName) : "Teacher";

  if (!teacherId) {
    // If teacherId is missing, redirect to the login page.
    redirect('/login/teacher');
  }
  // Note: The authoritative teacherName will be fetched by individual pages like the dashboard if needed.
  // The name from searchParams is used for the AppHeader as an initial display.

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
