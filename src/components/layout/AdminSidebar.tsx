
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { LayoutDashboard, LogOut, GanttChartSquare, Settings } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, tooltip: "Website Content Management" },
];

export function AdminSidebar() {
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
    return pathname === href;
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        {state === 'expanded' && (
           <Link href="/admin/dashboard" className="ml-2">
            <span className="text-lg font-headline font-semibold text-sidebar-foreground">
              St. Mbaaga's <span className="text-xs text-sidebar-foreground/70">Admin</span>
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
            {adminNavItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={isItemActive(item.href)} tooltip={item.tooltip || item.label} className="justify-start">
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
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
          <span className="group-data-[state=collapsed]:hidden">Log Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
