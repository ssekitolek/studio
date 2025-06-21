"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation"; 
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, BookOpenCheck, History, LogOut, GanttChartSquare, UserCircle, ClipboardList } from "lucide-react";

interface TeacherSidebarProps {
  teacherIdParam?: string; // Prop from layout, used as fallback or for SSR
  teacherNameParam?: string; // Prop from layout
}

export function TeacherSidebar({ teacherIdParam, teacherNameParam }: TeacherSidebarProps) {
  const pathname = usePathname();
  const searchParamsHook = useSearchParams(); 
  const { state } = useSidebar();

  // Get dynamic params from URL using the hook, more reliable for client-side updates
  const teacherIdFromUrl = searchParamsHook?.get("teacherId");
  const teacherNameFromUrlRaw = searchParamsHook?.get("teacherName");

  // Prioritize URL params from hook, fallback to props (e.g., for SSR or if hook not ready/URL has no params yet)
  const currentTeacherId = teacherIdFromUrl || teacherIdParam;
  let currentTeacherName = "Teacher"; // Default

  if (teacherNameFromUrlRaw) {
    try {
        currentTeacherName = decodeURIComponent(teacherNameFromUrlRaw);
    } catch (e) {
        console.warn("Failed to decode teacherNameFromUrlRaw from URL in Sidebar, using fallback/prop.");
        currentTeacherName = teacherNameParam || "Teacher";
    }
  } else if (teacherNameParam) {
    currentTeacherName = teacherNameParam;
  }

  const validTeacherId = currentTeacherId && currentTeacherId.toLowerCase() !== "undefined" && currentTeacherId.trim() !== "" && currentTeacherId !== "undefined" ? currentTeacherId : undefined;
  const validDecodedTeacherName = currentTeacherName && currentTeacherName.toLowerCase() !== "undefined" && currentTeacherName.trim() !== "" && currentTeacherName !== "undefined" ? currentTeacherName : "Teacher";

  const encodedTeacherId = validTeacherId ? encodeURIComponent(validTeacherId) : '';
  const encodedTeacherName = encodeURIComponent(validDecodedTeacherName);

  const navItems = [
    {
      href: validTeacherId ? `/teacher/dashboard?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "#",
      label: "Dashboard",
      icon: LayoutDashboard,
      tooltip: validTeacherId ? "View your dashboard" : "Dashboard (Login Required)",
      disabled: !validTeacherId,
    },
    {
      href: validTeacherId ? `/teacher/class-management?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "#",
      label: "Class Management",
      icon: ClipboardList,
      tooltip: validTeacherId ? "Manage your assigned classes" : "Class Management (Login Required)",
      disabled: !validTeacherId,
    },
    {
      href: validTeacherId ? `/teacher/marks/submit?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "#",
      label: "Submit Marks",
      icon: BookOpenCheck,
      tooltip: validTeacherId ? "Submit student marks" : "Submit Marks (Login Required)",
      disabled: !validTeacherId,
    },
    {
      href: validTeacherId ? `/teacher/marks/history?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "#",
      label: "View Submissions",
      icon: History,
      tooltip: validTeacherId ? "View past mark submissions" : "View Submissions (Login Required)",
      disabled: !validTeacherId,
    },
    {
      href: validTeacherId ? `/teacher/profile?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "#",
      label: "My Profile",
      icon: UserCircle,
      tooltip: validTeacherId ? "View your profile" : "My Profile (Login Required)",
      disabled: !validTeacherId,
    },
  ];

  const isItemActive = (href: string) => {
    if (!validTeacherId && href.startsWith("/teacher/")) {
        return false; // If teacherId is not valid, no teacher links should be active
    }
    const baseHref = href.split('?')[0]; // Compare only the path part, ignore query params

    // Exact match for dashboard
    if (baseHref === "/teacher/dashboard") {
      return pathname === baseHref;
    }
    // For other pages, check if current path starts with the link's base href
    return pathname.startsWith(baseHref);
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
          <Link href={validTeacherId ? `/teacher/dashboard?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}` : "/login/teacher"} className="ml-2">
            <span className="text-lg font-headline font-semibold text-sidebar-foreground">
              Grade<span className="text-sidebar-primary">Central</span> <span className="text-xs text-sidebar-foreground/70">Teacher</span>
            </span>
          </Link>
        )}
        <div className={state === 'expanded' ? '' : 'w-full flex justify-center'}>
          <SidebarTrigger asChild>
             <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <GanttChartSquare />
             </Button>
          </SidebarTrigger>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent asChild>
        <ScrollArea className="flex-1">
          <SidebarMenu className="px-2 py-2 space-y-1">
            {navItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                <Link href={item.disabled ? "#" : item.href} legacyBehavior={false}>
                  <SidebarMenuButton
                    asChild={false} 
                    isActive={!item.disabled && isItemActive(item.href)}
                    tooltip={item.tooltip}
                    className="justify-start"
                    disabled={item.disabled}
                    aria-disabled={item.disabled}
                    onClick={(e) => { if (item.disabled) e.preventDefault(); }}
                  >
                    <>
                      <item.icon className="h-5 w-5" />
                      {state === 'expanded' && <span>{item.label}</span>}
                    </>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <Link href="/" legacyBehavior={false}>
            <SidebarMenuButton tooltip="Log Out" className="justify-start" asChild={false}>
              <>
                <LogOut className="h-5 w-5" />
                {state === 'expanded' && <span>Log Out</span>}
              </>
            </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
