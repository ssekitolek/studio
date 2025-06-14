
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface LayoutProps {
  children: React.ReactNode;
  params?: { [key: string]: string | string[] | undefined };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function TeacherLayout({ children, params, searchParams }: LayoutProps) {
  // Log the received objects clearly
  console.log('[TeacherLayout] Entry. Received params:', params === undefined ? "undefined" : JSON.stringify(params, null, 2));
  console.log('[TeacherLayout] Entry. Received searchParams:', searchParams === undefined ? "undefined" : JSON.stringify(searchParams, null, 2));

  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default value

  if (searchParams?.teacherName) {
    try {
      teacherName = decodeURIComponent(searchParams.teacherName as string);
    } catch (e) {
      // Keep default name if decoding fails
      console.warn(`[TeacherLayout] WARN: Failed to decode teacherName: "${searchParams.teacherName}". Using default. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    // Log warning if searchParams is defined but teacherName is missing,
    // or if searchParams is undefined entirely (which implies teacherName is also missing)
    if (searchParams !== undefined) {
        console.warn('[TeacherLayout] WARN: teacherName is missing from searchParams (but searchParams object exists). Using default name "Teacher". SearchParams received:', JSON.stringify(searchParams, null, 2));
    } else {
        // This case is covered by the teacherId check mostly, but good to be explicit
        console.warn('[TeacherLayout] WARN: searchParams object is undefined, so teacherName is also missing. Using default name "Teacher".');
    }
  }

  if (!teacherId) {
    // This is the critical check. If searchParams is undefined, teacherId will be undefined.
    console.error(`[TeacherLayout] CRITICAL_ERROR: teacherId is missing. Redirecting to /login/teacher. searchParams object was: ${searchParams === undefined ? "undefined" : JSON.stringify(searchParams, null, 2)}`);
    redirect('/login/teacher');
  }

  console.log(`[TeacherLayout] INFO: Proceeding with teacherId: "${teacherId}", teacherName: "${teacherName}"`);

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
