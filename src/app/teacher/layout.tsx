
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions"; 
import { redirect } from 'next/navigation'; // For redirecting if no teacherId

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

  // If teacherId is present, fetch dashboard data to get the authoritative teacher name
  // This also ensures data fetching for layout parts (like AppHeader name) uses the logged-in teacher's ID.
  // This block is now guaranteed to run with a valid teacherId due to the redirect above.
  try {
    const dashboardData = await getTeacherDashboardData(teacherId);
    teacherName = dashboardData.teacherName || teacherName; // Prefer name from DB if available
  } catch (error) {
      console.error("Error fetching teacher data for layout:", error);
      // Keep the name from searchParams or default if DB fetch fails
  }

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
