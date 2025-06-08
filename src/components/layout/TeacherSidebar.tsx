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

const teacherNavItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, tooltip: "View your dashboard" },
  { href: "/teacher/marks/submit", label: "Submit Marks", icon: BookOpenCheck, tooltip: "Submit student marks" },
  { href: "/teacher/marks/history", label: "View Submissions", icon: History, tooltip: "View past mark submissions" },
];

export function TeacherSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isItemActive = (href: string) => {
    return pathname === href || (href !== "/teacher/dashboard" && pathname.startsWith(href));
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
          <Link href="/teacher/dashboard" className="ml-2">
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
            {teacherNavItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                <Link href={item.href} passHref legacyBehavior>
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
        <Link href="/" passHref legacyBehavior>
            <SidebarMenuButton tooltip="Log Out" className="justify-start">
              <LogOut className="h-5 w-5" />
              {state === 'expanded' && <span>Log Out</span>}
            </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
