
"use client";

import * as React from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  Settings2,
  FileText,
  Download,
  LogOut,
  GanttChartSquare,
  BookUser,
  CalendarDays,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const dosNavItems = [
  { href: "/dos/dashboard", label: "Dashboard", icon: LayoutDashboard, tooltip: "Dashboard" },
  {
    label: "Management",
    icon: Users,
    isSection: true,
    subItems: [
      { href: "/dos/teachers", label: "Teachers", icon: BookUser, tooltip: "Manage Teachers" },
      { href: "/dos/teachers/assignments", label: "Teacher Assignments", icon: UserCheck, tooltip: "Manage Teacher Assignments" },
      { href: "/dos/students", label: "Students", icon: Users, tooltip: "Manage Students" },
      { href: "/dos/classes", label: "Classes & Subjects", icon: ClipboardList, tooltip: "Manage Classes & Subjects" },
    ],
  },
  {
    label: "Academic Setup",
    icon: Settings2,
    isSection: true,
    subItems: [
      { href: "/dos/settings/terms", label: "Terms", icon: CalendarDays, tooltip: "Manage Academic Terms" },
      { href: "/dos/settings/exams", label: "Exams & Grading", icon: FileText, tooltip: "Manage Exams & Grading" },
      { href: "/dos/settings/general", label: "General Settings", icon: Settings2, tooltip: "Manage General Settings" },
    ],
  },
  { href: "/dos/marks-review", label: "Marks Review", icon: ShieldAlert, tooltip: "Review submitted marks and check for anomalies"},
  { href: "/dos/reports/download-marks", label: "Download Reports", icon: Download, tooltip: "Download marks reports" },
];

export function DosSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isItemActive = (href: string) => {
    if (href === "/dos/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
           <Link href="/dos/dashboard" className="ml-2">
            <span className="text-lg font-headline font-semibold text-sidebar-foreground">
              Grade<span className="text-sidebar-primary">Central</span> <span className="text-xs text-sidebar-foreground/70">D.O.S</span>
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
            {dosNavItems.map((item, index) => {
              if (item.isSection && item.subItems) {
                return (
                  <React.Fragment key={index}>
                    {/* Expanded View: Section Header and indented Sub-Items */}
                    <div className="group-data-[state=collapsed]:hidden">
                      <SidebarMenuItem className="mt-2">
                        <div className="h-auto p-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 pointer-events-none flex items-center gap-2">
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem, subIndex) => (
                            <SidebarMenuSubItem key={`${index}-${subIndex}`}>
                              <Link href={subItem.href}>
                                <SidebarMenuSubButton isActive={isItemActive(subItem.href)} className="justify-start">
                                  <subItem.icon className="h-4 w-4 mr-2" />
                                  <span>{subItem.label}</span>
                                </SidebarMenuSubButton>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    </div>

                    {/* Collapsed View: Each Sub-Item as a top-level icon */}
                    <div className="group-data-[state=expanded]:hidden">
                      {item.subItems.map((subItem, subIndex) => (
                        <SidebarMenuItem key={`${index}-collapsed-${subIndex}`}>
                          <Link href={subItem.href}>
                            <SidebarMenuButton isActive={isItemActive(subItem.href)} tooltip={subItem.tooltip || subItem.label} className="justify-start">
                              <subItem.icon className="h-5 w-5" />
                              <span className="group-data-[state=collapsed]:hidden">{subItem.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  </React.Fragment>
                );
              }

              // Render top-level items (like Dashboard, Marks Review, etc.)
              return (
                <SidebarMenuItem key={index}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={isItemActive(item.href)} tooltip={item.tooltip || item.label} className="justify-start">
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <Link href="/">
          <SidebarMenuButton tooltip="Log Out" className="justify-start">
            <LogOut className="h-5 w-5" />
            <span className="group-data-[state=collapsed]:hidden">Log Out</span>
          </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
