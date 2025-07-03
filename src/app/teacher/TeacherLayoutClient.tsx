
"use client";

import { useSearchParams } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export function TeacherLayoutClient({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const teacherIdParam = searchParams?.get("teacherId") ?? undefined;
  let teacherName = "Teacher";

  const nameParam = searchParams?.get("teacherName");
  if (nameParam) {
    try {
      teacherName = decodeURIComponent(nameParam);
    } catch (e) {
      console.warn("Failed to decode teacherName in TeacherLayout, using default.");
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
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
