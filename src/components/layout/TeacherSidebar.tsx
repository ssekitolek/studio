
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { LayoutDashboard, BookOpenCheck, History, LogOut, GanttChartSquare, UserCircle } from "lucide-react";

interface TeacherSidebarProps {
  teacherIdParam?: string; 
  teacherNameParam?: string; // Made optional, will default if needed
}

export function TeacherSidebar({ teacherIdParam, teacherNameParam }: TeacherSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  
  const validTeacherId = teacherIdParam && teacherIdParam !== "undefined" ? teacherIdParam : undefined;
  const validTeacherName = teacherNameParam && teacherNameParam !== "undefined" ? teacherNameParam : "Teacher";

  const encodedTeacherId = validTeacherId ? encodeURIComponent(validTeacherId) : '';
  const encodedTeacherName = encodeURIComponent(validTeacherName);

  const navItems = [
    { 
      href: `/teacher/dashboard?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}`, 
      label: "Dashboard", 
      icon: LayoutDashboard, 
      tooltip: "View your dashboard",
      disabled: !validTeacherId,
    },
    { 
      href: `/teacher/marks/submit?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}`, 
      label: "Submit Marks", 
      icon: BookOpenCheck, 
      tooltip: "Submit student marks",
      disabled: !validTeacherId,
    },
    { 
      href: `/teacher/marks/history?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}`, 
      label: "View Submissions", 
      icon: History, 
      tooltip: "View past mark submissions",
      disabled: !validTeacherId,
    },
    { 
      href: `/teacher/profile?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}`, 
      label: "My Profile", 
      icon: UserCircle, 
      tooltip: "View your profile",
      disabled: !validTeacherId,
    },
  ];

  const isItemActive = (href: string) => {
    const baseHref = href.split('?')[0]; 
    return pathname === baseHref || (baseHref !== "/teacher/dashboard" && pathname.startsWith(baseHref));
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
          <Link href={validTeacherId ? `/teacher/dashboard?teacherId=${encodedTeacherId}&teacherName=${encodedTeacherName}`: "/login/teacher"} className="ml-2">
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
                <Link href={item.disabled ? "#" : item.href} passHref legacyBehavior={item.disabled}>
                  <SidebarMenuButton 
                    isActive={!item.disabled && isItemActive(item.href)} 
                    tooltip={item.tooltip} 
                    className="justify-start"
                    disabled={item.disabled}
                    aria-disabled={item.disabled}
                    onClick={(e) => { if (item.disabled) e.preventDefault(); }}
                  >
                    <item.icon className="h-5 w-5" />
                     {state === 'expanded' && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <Link href="/">
            <SidebarMenuButton tooltip="Log Out" className="justify-start">
              <LogOut className="h-5 w-5" />
              {state === 'expanded' && <span>Log Out</span>}
            </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
