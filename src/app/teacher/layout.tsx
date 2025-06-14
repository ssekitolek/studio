
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function TeacherLayout({ children, params, searchParams }: LayoutProps) {
  // Log the received objects clearly
  // console.log('[TeacherLayout] Entry. Received params:', params === undefined ? "undefined" : JSON.stringify(params, null, 2)); // Commented out due to Next.js error: "params should be awaited"
  // console.log('[TeacherLayout] Entry. Received searchParams:', searchParams === undefined ? "undefined" : JSON.stringify(searchParams, null, 2)); // Commented out

  // Alternative minimal logging if needed, without direct stringify which might cause issues:
  // console.log('[TeacherLayout] params object available:', !!params);
  // console.log('[TeacherLayout] searchParams object available:', !!searchParams);


  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default value

  if (searchParams?.teacherName) {
    try {
      teacherName = decodeURIComponent(searchParams.teacherName as string);
    } catch (e) {
      // Previous console.warn related to teacherName decoding was commented out based on user interactions.
      // console.warn(`[TeacherLayout] WARN: Failed to decode teacherName: "${searchParams.teacherName}". Using default. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    // Previous console.warn for missing teacherName when searchParams is defined was commented out.
    // if (searchParams !== undefined) {
        // console.warn(`[TeacherLayout] WARN: teacherName is missing from searchParams (but searchParams object exists). Using default name "Teacher". SearchParams received: ${JSON.stringify(searchParams, null, 2)}`);
    // }
    // Previous console.warn for searchParams being undefined was commented out.
    // else {
        // console.warn('[TeacherLayout] WARN: searchParams object is undefined, so teacherName is also missing. Using default name "Teacher".');
    // }
  }

  if (!teacherId) {
    // This is the critical check. If searchParams is undefined, teacherId will be undefined.
    // The console.error for this specific case was commented out in previous steps.
    // console.error(`[TeacherLayout] DIAGNOSTIC: Critical state detected - teacherId is missing due to 'searchParams' being undefined. Initiating redirect to /login/teacher. Details: searchParams object received as: ${searchParams === undefined ? "undefined" : JSON.stringify(searchParams, null, 2)}`);
    redirect('/login/teacher');
  }

  // console.log(`[TeacherLayout] INFO: Proceeding with teacherId: "${teacherId}", teacherName: "${teacherName}"`);

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
