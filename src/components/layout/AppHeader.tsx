
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { LogOut, Settings, UserCircle, UserCog, ShieldCheck } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AppHeaderProps {
  userName?: string;
  userEmail?: string; 
  userRole: "D.O.S." | "Teacher" | "Admin";
  userAvatarUrl?: string;
}

export function AppHeader({ userName, userEmail, userRole, userAvatarUrl }: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const getInitials = (name: string | undefined) => {
    if (!name || name.trim() === "") {
        if(userRole === 'Teacher') return 'TE';
        if(userRole === 'D.O.S.') return 'DO';
        if(userRole === 'Admin') return 'AD';
        return 'U';
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const displayUserName = userName || userEmail || "User";
  const displayUserEmail = userEmail || "No email available";

  let settingsOrProfileLink = "/";
  let dashboardLink = "/";
  let Icon = UserCircle;

  switch(userRole) {
    case 'Teacher':
        settingsOrProfileLink = "/teacher/profile";
        dashboardLink = "/teacher/dashboard";
        Icon = UserCircle;
        break;
    case 'D.O.S.':
        settingsOrProfileLink = "/dos/settings/general";
        dashboardLink = "/dos/dashboard";
        Icon = UserCog;
        break;
    case 'Admin':
        settingsOrProfileLink = "/admin/dashboard";
        dashboardLink = "/admin/dashboard";
        Icon = ShieldCheck;
        break;
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
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayUserName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userRole} | {displayUserEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={settingsOrProfileLink}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{userRole === "Teacher" ? "My Profile" : "Settings"}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
