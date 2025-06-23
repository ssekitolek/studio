
"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, Settings, UserCircle } from "lucide-react";

interface AppHeaderProps {
  userName?: string; 
  userRole: "D.O.S." | "Teacher" | "Admin";
  userAvatarUrl?: string;
  teacherId?: string; 
  teacherNameParam?: string; 
}

export function AppHeader({ userName, userRole, userAvatarUrl, teacherId, teacherNameParam }: AppHeaderProps) {
  const displayUserName = userName || (userRole === "Teacher" ? (teacherNameParam || "Teacher") : "Admin");
  
  const getInitials = (name: string) => {
    if (!name || name.trim() === "") {
      return userRole === "Teacher" ? "T" : "A";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || (userRole === "Teacher" ? "T" : "A");
  };

  const validTeacherIdForLink = teacherId && teacherId.toLowerCase() !== "undefined" && teacherId.trim() !== "" ? teacherId : undefined;
  let validTeacherNameForLink: string | undefined;

  if (teacherNameParam && teacherNameParam.toLowerCase() !== "undefined" && teacherNameParam.trim() !== "") {
    validTeacherNameForLink = teacherNameParam;
  } else if (displayUserName && displayUserName !== "Teacher" && displayUserName !== "Admin") {
    validTeacherNameForLink = displayUserName;
  } else {
    validTeacherNameForLink = userRole === "Teacher" ? "Teacher" : undefined;
  }

  let dashboardLink = "/";
  if (userRole === "D.O.S.") {
      dashboardLink = "/dos/dashboard";
  } else if (userRole === "Admin") {
      dashboardLink = "/admin/dashboard";
  } else if (userRole === "Teacher") {
      dashboardLink = (validTeacherIdForLink && validTeacherNameForLink)
        ? `/teacher/dashboard?teacherId=${encodeURIComponent(validTeacherIdForLink)}&teacherName=${encodeURIComponent(validTeacherNameForLink)}`
        : "/login/teacher";
  }
  
  let settingsOrProfileLink = "/";
   if (userRole === "D.O.S.") {
      settingsOrProfileLink = "/dos/settings/general";
  } else if (userRole === "Admin") {
      settingsOrProfileLink = "/admin/dashboard"; // Admin dashboard is the settings page for now
  } else if (userRole === "Teacher") {
      settingsOrProfileLink = (validTeacherIdForLink && validTeacherNameForLink)
        ? `/teacher/profile?teacherId=${encodeURIComponent(validTeacherIdForLink)}&teacherName=${encodeURIComponent(validTeacherNameForLink)}`
        : "/login/teacher";
  }
  

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <Link href={dashboardLink} className="flex items-center gap-2">
           <span className="text-xl font-headline font-semibold text-primary">
            St. Mbaaga's<span className="text-accent"> College</span>
           </span>
        </Link>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userAvatarUrl || `https://placehold.co/100x100.png`} alt={displayUserName} data-ai-hint="profile person" />
              <AvatarFallback>{getInitials(displayUserName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayUserName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userRole}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild disabled={userRole === "Teacher" && (!validTeacherIdForLink || !validTeacherNameForLink)}>
            <Link href={settingsOrProfileLink}>
              {userRole === "D.O.S." || userRole === "Admin" ? <Settings className="mr-2 h-4 w-4" /> : <UserCircle className="mr-2 h-4 w-4" />}
              <span>{userRole === "Teacher" ? "My Profile" : "Settings"}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/"> {/* Always logout to main landing page */}
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
