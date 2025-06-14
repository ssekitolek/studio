
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

interface TeacherLayoutProps {
  children: React.ReactNode;
  // searchParams should be automatically provided by Next.js
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function TeacherLayout(props: TeacherLayoutProps) {
  const { children, searchParams } = props;

  // Log the received searchParams object itself
  console.log('[TeacherLayout] Received props.searchParams:', JSON.stringify(searchParams, null, 2));

  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default value

  if (searchParams?.teacherName) {
    try {
      teacherName = decodeURIComponent(searchParams.teacherName as string);
    } catch (e) {
      console.warn(`[TeacherLayout] Failed to decode teacherName: "${searchParams.teacherName}". Using default. Error: ${e}`);
      // teacherName remains "Teacher"
    }
  } else {
    console.warn('[TeacherLayout] teacherName is missing from searchParams. Using default name "Teacher".');
  }

  if (!teacherId) {
    console.warn(`[TeacherLayout] teacherId is missing from searchParams. Redirecting to /login/teacher. Current searchParams object: ${JSON.stringify(searchParams, null, 2)}`);
    redirect('/login/teacher');
  }

  console.log(`[TeacherLayout] Proceeding with teacherId: ${teacherId}, teacherName: ${teacherName}`);

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
