
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
    // This is a basic protection for prototype. In production, use proper auth middleware.
    // console.warn("TeacherLayout: No teacherId in searchParams, redirecting to login.");
    // For now, we'll allow it to proceed for easier testing of pages directly, but in a real app, you'd redirect.
    // redirect('/login/teacher'); 
    // If we don't redirect, we need a fallback or fetch name differently if ID isn't passed for some reason.
    // For prototype simplicity, if ID isn't there, we can just use a default name.
    // However, data fetching on dashboard would fail without teacherId.
    // For now, let's assume teacherId will usually be there after login.
    // If we still want to fetch a name, we might need a default/mock ID if teacherId is missing.
  }

  // If teacherId is present, fetch dashboard data to get the authoritative teacher name
  // This also ensures data fetching for layout parts (like AppHeader name) uses the logged-in teacher's ID.
  if (teacherId) {
    try {
      const dashboardData = await getTeacherDashboardData(teacherId);
      teacherName = dashboardData.teacherName || teacherName; // Prefer name from DB if available
    } catch (error) {
        console.error("Error fetching teacher data for layout:", error);
        // Keep the name from searchParams or default if DB fetch fails
    }
  } else {
    // Handle case where teacherId is absolutely required for layout/header
    // For now, we'll proceed with "Teacher" if no ID
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
