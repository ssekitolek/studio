
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>; // For route params like /teacher/[segment]
  searchParams?: Record<string, string | string[] | undefined>; // For URL query params like ?teacherId=xyz
}

export default function TeacherLayout({ children, params, searchParams }: LayoutProps) {
  // searchParams can be undefined if not provided by Next.js or if the URL has no query string.
  // We must handle this gracefully.

  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default name

  if (searchParams?.teacherName) {
    try {
      // Ensure teacherName is a string before decoding
      const nameParam = searchParams.teacherName;
      if (typeof nameParam === 'string') {
        teacherName = decodeURIComponent(nameParam);
      } else if (Array.isArray(nameParam) && nameParam.length > 0 && typeof nameParam[0] === 'string') {
        // Handle if teacherName is an array of strings (take the first one)
        teacherName = decodeURIComponent(nameParam[0]);
      }
    } catch (e) {
      // If decoding fails (e.g., malformed URI), use the default name.
      // console.warn(`[TeacherLayout] Failed to decode teacherName. Using default. Error: ${e}`);
    }
  }

  if (!teacherId) {
    // This is the critical check. If searchParams was undefined or didn't contain teacherId,
    // teacherId will be undefined here.
    redirect('/login/teacher');
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <TeacherSidebar teacherIdParam={teacherId} teacherNameParam={teacherName} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader
            userName={teacherName}
            userRole="Teacher"
            teacherId={teacherId} // Pass the validated/extracted teacherId
            teacherNameParam={teacherName} // Pass the validated/extracted teacherName
          />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
