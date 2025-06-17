
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, Loader2, AlertTriangle } from "lucide-react";
import { getTeacherProfileData } from "@/lib/actions/teacher-actions";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


interface TeacherProfile {
  name?: string;
  email?: string;
}

export default function TeacherProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter(); 
  const { toast } = useToast();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
        setPageError("Could not access URL parameters. Please try reloading or logging in again.");
        setIsLoading(false);
        toast({ title: "Error", description: "URL parameters unavailable.", variant: "destructive" });
        return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl.toLowerCase() === "undefined") {
      const msg = `Teacher ID invalid or missing from URL (received: '${teacherIdFromUrl}'). Cannot load profile. Please login again.`;
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setCurrentTeacherId(null);
      setIsLoading(false); 
      return;
    }

    setCurrentTeacherId(teacherIdFromUrl);
    setPageError(null); 
    setIsLoading(true);

    async function fetchData(validTeacherId: string) {
      try {
        const data = await getTeacherProfileData(validTeacherId);
        if (data) {
          setProfile(data);
        } else {
          const notFoundMsg = `Failed to load profile data or profile not found for ID: ${validTeacherId}. Please contact administration if this persists.`;
          setPageError(notFoundMsg);
          toast({ title: "Profile Not Found", description: notFoundMsg, variant: "destructive" });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unexpected error occurred.";
        setPageError(errorMsg);
        toast({ title: "Error Loading Profile", description: errorMsg, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData(teacherIdFromUrl);
  }, [searchParams, toast]); 

  if (isLoading && currentTeacherId) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <UIAlertTitle>Error Loading Profile</UIAlertTitle>
          <AlertDescription>
            {pageError}
            {(!currentTeacherId) && <span> You can try to <Link href="/login/teacher" className="underline">login again</Link>.</span>}
            If the issue persists, contact administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile && !isLoading && currentTeacherId) { 
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
            Profile data could not be loaded for Teacher ID: {currentTeacherId}. Please contact D.O.S. if you believe this is an error.
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentTeacherId && !isLoading && !pageError) { 
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
             Teacher ID not found. Please <Link href="/login/teacher" className="underline">login</Link> to view your profile.
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your personal information and settings."
        icon={UserCircle}
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">{profile?.name || "N/A"}</CardTitle>
          <CardDescription>Teacher Profile Details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
            <p className="text-foreground">{profile?.name || "Not specified"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
            <p className="text-foreground">{profile?.email || "Not specified"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
