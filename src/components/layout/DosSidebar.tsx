
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

const dosNavItems = [
  { href: "/dos/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Management",
    icon: Users,
    isSection: true,
    subItems: [
      { href: "/dos/teachers", label: "Teachers", icon: BookUser },
      { href: "/dos/teachers/assignments", label: "Teacher Assignments", icon: UserCheck },
      { href: "/dos/students", label: "Students", icon: Users },
      { href: "/dos/classes", label: "Classes & Subjects", icon: ClipboardList },
    ],
  },
  {
    label: "Academic Setup",
    icon: Settings2,
    isSection: true,
    subItems: [
      { href: "/dos/settings/terms", label: "Terms", icon: CalendarDays },
      { href: "/dos/settings/exams", label: "Exams & Grading", icon: FileText },
      { href: "/dos/settings/general", label: "General Settings", icon: Settings2 },
    ],
  },
  { href: "/dos/marks-review", label: "Marks Review", icon: ShieldAlert, tooltip: "Review submitted marks and check for anomalies"},
  { href: "/dos/reports/download-marks", label: "Download Reports", icon: Download, tooltip: "Download marks reports" },
];

export function DosSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isItemActive = (href: string) => {
    // For dashboard, only active if it's an exact match
    if (href === "/dos/dashboard") {
        return pathname === href;
    }
    // For section parent links or other specific top-level links
    // (e.g., /dos/marks-review, /dos/reports/download-marks)
    if (dosNavItems.some(item => item.href === href && !item.isSection)) {
        return pathname === href || pathname.startsWith(`${href}/`); // Handles potential child pages if any
    }

    // For sub-items or section items that act as containers (like /dos/teachers, /dos/settings/terms)
    // The link is active if the current path starts with the item's href.
    // We also need to be careful not to activate a parent if a more specific child is active.
    
    // Example: If on /dos/teachers/assignments, /dos/teachers should also appear active.
    // However, if href is /dos/teachers and pathname is /dos/teachers/assignments, it's active.
    // But if href is /dos/teachers and pathname is /dos/students, it's not.

    // A more precise check for section parents
    const sectionParent = dosNavItems.find(item => item.isSection && item.subItems?.some(sub => href === sub.href));
    if (sectionParent) { // This 'href' is a sub-item
        return pathname.startsWith(href);
    }
    
    // Default for other links if any other logic is needed
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: any, index: number) => {
    if (item.isSection) {
      return (
        <SidebarMenuItem key={index} className="mt-2">
          {state === 'expanded' && <span className="px-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">{item.label}</span>}
          {item.subItems && (
             <SidebarMenuSub>
              {item.subItems.map((subItem: any, subIndex: number) => (
                <SidebarMenuSubItem key={`${index}-${subIndex}`}>
                  <Link href={subItem.href}>
                    <SidebarMenuSubButton isActive={isItemActive(subItem.href)} className="justify-start">
                      <subItem.icon className="h-4 w-4 mr-2" />
                      {state === 'expanded' && <span>{subItem.label}</span>}
                    </SidebarMenuSubButton>
                  </Link>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={index}>
        <Link href={item.href}>
          <SidebarMenuButton isActive={isItemActive(item.href)} tooltip={item.tooltip} className="justify-start">
            <item.icon className="h-5 w-5" />
            {state === 'expanded' && <span>{item.label}</span>}
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
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
            {dosNavItems.map(renderNavItem)}
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

