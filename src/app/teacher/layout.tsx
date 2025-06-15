
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, string | string[] | undefined>; // searchParams is optional but expected for teacher routes
}

export default function TeacherLayout({ children, params, searchParams }: LayoutProps) {
  console.log('[TeacherLayout] Rendering. searchParams object is defined:', !!searchParams);

  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default value

  if (searchParams?.teacherName) {
    try {
      teacherName = decodeURIComponent(searchParams.teacherName as string);
    } catch (e) {
      // Silently use default if decoding fails, or add a specific log if needed
      // console.warn(`[TeacherLayout] Failed to decode teacherName: "${searchParams.teacherName}". Using default. Error: ${e}`);
    }
  }

  if (!teacherId) {
    // This is the critical check. If searchParams is undefined or doesn't contain teacherId, redirect.
    redirect('/login/teacher');
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <TeacherSidebar teacherIdParam={teacherId} teacherNameParam={teacherName} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader
            userName={teacherName}
            userRole="Teacher"
            teacherId={teacherId}
            teacherNameParam={teacherName}
          />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
