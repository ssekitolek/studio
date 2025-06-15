
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, string | string[] | undefined>; // searchParams is optional, reflecting runtime reality
}

export default function TeacherLayout({ children, params, searchParams }: LayoutProps) {
  // This log helps diagnose if searchParams is undefined when the component renders.
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
  // else {
    // The following console.warn was commented out because it might be flagged as an error source by Next.js,
    // even though it's a diagnostic message. The log at the top serves a similar purpose.
    // console.warn(`[TeacherLayout] WARN: searchParams object is undefined, so teacherName is also missing. Using default name "Teacher".`);
  // }

  if (!teacherId) {
    // This is the critical check. If searchParams is undefined, teacherId will be undefined.
    // The console.error here was commented out as it was being flagged as an error source by Next.js in the visual error overlay.
    // The diagnostic console.log at the top of the function helps identify if searchParams is undefined.
    // console.error(`[TeacherLayout] DIAGNOSTIC: Critical state detected - teacherId is missing due to 'searchParams' being undefined. Initiating redirect to /login/teacher. Details: searchParams object received as: ${searchParams === undefined ? "undefined" : JSON.stringify(searchParams, null, 2)}`);
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

