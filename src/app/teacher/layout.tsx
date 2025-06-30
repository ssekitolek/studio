
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: { [key: string]: string | string[] | undefined }; 
}

export default function TeacherLayout({ children, searchParams }: LayoutProps) {
  // Attempt to get teacherId and teacherName from searchParams (server-side)
  // These might be undefined if searchParams are not available during initial render or are missing
  const teacherIdParam = typeof searchParams?.teacherId === 'string' ? searchParams.teacherId : undefined;
  let teacherName = "Teacher"; // Default

  if (searchParams?.teacherName) {
    const nameParam = searchParams.teacherName;
    if (typeof nameParam === 'string') {
      try {
        teacherName = decodeURIComponent(nameParam);
      } catch (e) {
        console.warn("Failed to decode teacherName in TeacherLayout (string), using default.");
        // Use default if decoding fails
      }
    } else if (Array.isArray(nameParam) && nameParam.length > 0 && typeof nameParam[0] === 'string') {
      try {
        teacherName = decodeURIComponent(nameParam[0]);
      } catch (e) {
         console.warn("Failed to decode teacherName in TeacherLayout (array), using default.");
         // Use default if decoding fails
      }
    }
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
        <TeacherSidebar teacherIdParam={teacherIdParam} teacherNameParam={teacherName} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AppHeader
            userName={teacherName}
            userRole="Teacher"
            teacherId={teacherIdParam} 
            teacherNameParam={teacherName}
          />
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
