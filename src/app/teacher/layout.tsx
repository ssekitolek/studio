
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: { [key: string]: string | string[] | undefined }; 
}

export default function TeacherLayout({ children, searchParams }: LayoutProps) {
  const teacherId = searchParams?.teacherId as string | undefined;
  let teacherName = "Teacher"; // Default name

  if (searchParams?.teacherName) {
    const nameParam = searchParams.teacherName;
    if (typeof nameParam === 'string') {
      try {
        teacherName = decodeURIComponent(nameParam);
      } catch (e) {
        // console.warn(`[TeacherLayout] Failed to decode teacherName (string). Using default. Error: ${e}`);
      }
    } else if (Array.isArray(nameParam) && nameParam.length > 0 && typeof nameParam[0] === 'string') {
      try {
        teacherName = decodeURIComponent(nameParam[0]);
      } catch (e) {
        // console.warn(`[TeacherLayout] Failed to decode teacherName (array). Using default. Error: ${e}`);
      }
    }
  }

  // Removed redirect logic to stop the loop.
  // Pages themselves will handle missing/invalid teacherId using useSearchParams.

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
