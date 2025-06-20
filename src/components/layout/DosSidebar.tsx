
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

  const isItemActive = (href: string, isSubItem: boolean = false) => {
    // Exact match for dashboard
    if (href === "/dos/dashboard") {
      return pathname === href;
    }
    // For top-level items that are not section headers (e.g., Marks Review, Download Reports)
    // and for sub-items.
    // The link is active if the current path starts with the item's href.
    // This handles cases like /dos/teachers being active for /dos/teachers/new or /dos/teachers/[id]/edit
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: any, index: number) => {
    if (item.isSection) {
      const firstSubItemHref = item.subItems?.[0]?.href || "#";
      const isSectionActive = item.subItems.some((sub: any) => isItemActive(sub.href, true));

      const sectionHeader = (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={firstSubItemHref}
                className={cn(
                  "flex items-center gap-2 rounded-md transition-colors",
                  // Styles for expanded state (looks like a text label)
                  "group-data-[state=expanded]:h-auto group-data-[state=expanded]:p-2 group-data-[state=expanded]:text-xs group-data-[state=expanded]:font-semibold group-data-[state=expanded]:uppercase group-data-[state=expanded]:tracking-wider group-data-[state=expanded]:text-sidebar-foreground/70 group-data-[state=expanded]:pointer-events-none",
                  // Styles for collapsed state (looks like a button)
                  "group-data-[state=collapsed]:size-8 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:hover:bg-sidebar-accent group-data-[state=collapsed]:hover:text-sidebar-accent-foreground",
                  isSectionActive && "group-data-[state=collapsed]:bg-sidebar-accent group-data-[state=collapsed]:text-sidebar-accent-foreground"
                )}
                aria-disabled={state === 'expanded'}
                tabIndex={state === 'expanded' ? -1 : 0}
                onClick={(e) => { if (state === 'expanded') e.preventDefault(); }}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" hidden={state === 'expanded'}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      return (
        <SidebarMenuItem key={index} className="mt-2">
          {sectionHeader}
          <SidebarMenuSub className="group-data-[state=collapsed]:hidden">
            {item.subItems && item.subItems.map((subItem: any, subIndex: number) => (
              <SidebarMenuSubItem key={`${index}-${subIndex}`}>
                <Link href={subItem.href}>
                  <SidebarMenuSubButton isActive={isItemActive(subItem.href, true)} className="justify-start">
                    <subItem.icon className="h-4 w-4 mr-2" />
                    <span>{subItem.label}</span>
                  </SidebarMenuSubButton>
                </Link>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </SidebarMenuItem>
      );
    }

    // For non-section, top-level items
    return (
      <SidebarMenuItem key={index}>
        <Link href={item.href}>
          <SidebarMenuButton isActive={isItemActive(item.href)} tooltip={item.tooltip} className="justify-start">
            <item.icon className="h-5 w-5" />
            <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
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
            <span className="group-data-[state=collapsed]:hidden">Log Out</span>
          </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
