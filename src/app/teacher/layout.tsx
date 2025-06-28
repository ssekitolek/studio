
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface LayoutProps {
  children: React.ReactNode;
  params: Record<string, string | string[] | undefined>;
  searchParams?: { [key: string]: string | string[] | undefined }; 
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-muted rounded-md" />
            <div>
              <div className="h-8 w-48 bg-muted rounded-md" />
              <div className="h-4 w-64 bg-muted rounded-md mt-2" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border rounded-lg space-y-4 bg-card">
         <div className="h-8 w-1/2 bg-muted rounded-md" />
         <div className="h-10 w-full bg-muted rounded-md" />
      </div>
       <div className="p-4 border rounded-lg space-y-4 bg-card">
         <div className="h-8 w-1/3 bg-muted rounded-md" />
         <div className="h-40 w-full bg-muted rounded-md" />
      </div>
    </div>
  );
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
            <Suspense fallback={<LoadingSkeleton />}>
              {children}
            </Suspense>
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
