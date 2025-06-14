
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
  teacherIdParam: string; 
  teacherNameParam: string;
}

export function TeacherSidebar({ teacherIdParam, teacherNameParam }: TeacherSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();

  const navItems = [
    { 
      href: `/teacher/dashboard?teacherId=${encodeURIComponent(teacherIdParam)}&teacherName=${encodeURIComponent(teacherNameParam)}`, 
      label: "Dashboard", 
      icon: LayoutDashboard, 
      tooltip: "View your dashboard" 
    },
    { 
      href: `/teacher/marks/submit?teacherId=${encodeURIComponent(teacherIdParam)}&teacherName=${encodeURIComponent(teacherNameParam)}`, 
      label: "Submit Marks", 
      icon: BookOpenCheck, 
      tooltip: "Submit student marks" 
    },
    { 
      href: `/teacher/marks/history?teacherId=${encodeURIComponent(teacherIdParam)}&teacherName=${encodeURIComponent(teacherNameParam)}`, 
      label: "View Submissions", 
      icon: History, 
      tooltip: "View past mark submissions" 
    },
    // { 
    //   href: `/teacher/profile?teacherId=${encodeURIComponent(teacherIdParam)}&teacherName=${encodeURIComponent(teacherNameParam)}`, 
    //   label: "My Profile", 
    //   icon: UserCircle, 
    //   tooltip: "View your profile" 
    // },
  ];

  const isItemActive = (href: string) => {
    const baseHref = href.split('?')[0]; 
    return pathname === baseHref || (baseHref !== "/teacher/dashboard" && pathname.startsWith(baseHref));
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
          <Link href={`/teacher/dashboard?teacherId=${encodeURIComponent(teacherIdParam)}&teacherName=${encodeURIComponent(teacherNameParam)}`} className="ml-2">
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
                <Link href={item.href}>
                  <SidebarMenuButton isActive={isItemActive(item.href)} tooltip={item.tooltip} className="justify-start">
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
