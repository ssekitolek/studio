
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
import { LayoutDashboard, BookOpenCheck, History, LogOut, GanttChartSquare, UserCircle, ClipboardList, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const navItems = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/class-management", label: "Class Management", icon: ClipboardList },
    { href: "/teacher/attendance", label: "Take Attendance", icon: ClipboardCheck },
    { href: "/teacher/attendance/history", label: "Attendance History", icon: History },
    { href: "/teacher/marks/submit", label: "Submit Marks", icon: BookOpenCheck },
    { href: "/teacher/marks/history", label: "View Submissions", icon: History },
    { href: "/teacher/profile", label: "My Profile", icon: UserCircle },
];

export function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const isItemActive = (href: string) => {
    // Exact match for dashboard and take attendance to avoid overlap with history
    if (href === "/teacher/dashboard" || href === "/teacher/attendance") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
          <Link href="/teacher/dashboard" className="ml-2">
            <span className="text-lg font-headline font-semibold text-sidebar-foreground">
              St. Mbaaga's <span className="text-xs text-sidebar-foreground/70">Teacher</span>
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
                  <SidebarMenuButton
                    isActive={isItemActive(item.href)}
                    tooltip={item.label}
                    className="justify-start"
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
        <SidebarMenuButton tooltip="Log Out" className="justify-start" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          {state === 'expanded' && <span>Log Out</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
