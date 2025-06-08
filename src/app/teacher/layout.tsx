
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions"; // For teacher name

export default async function TeacherLayout({ // Make layout async
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch teacher name for the header
  // In a real app, teacherId would come from session/auth
  const teacherId = "teacher123"; // Placeholder
  const dashboardData = await getTeacherDashboardData(teacherId);
  const teacherName = dashboardData.teacherName || "Teacher";


  return (
    <SidebarProvider defaultOpen={true}>
        <TeacherSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader userName={teacherName} userRole="Teacher" />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
