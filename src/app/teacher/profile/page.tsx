
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, Loader2, AlertTriangle } from "lucide-react";
import { getTeacherProfileData } from "@/lib/actions/teacher-actions";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import Link from "next/link";


interface TeacherProfile {
  name?: string;
  email?: string;
}

export default function TeacherProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const teacherIdFromUrl = searchParams.get("teacherId");

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherIdFromUrl || teacherIdFromUrl === "undefined") {
      const msg = `Teacher ID invalid (received: '${teacherIdFromUrl}'). Cannot load profile.`;
      setError(msg);
      setIsLoading(false);
      // Optionally redirect if preferred, but showing an error on page is also fine.
      // if (typeof window !== "undefined") router.push("/login/teacher");
      return;
    }
    
    setError(null);
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await getTeacherProfileData(teacherIdFromUrl as string);
        if (data) {
          setProfile(data);
        } else {
          setError("Failed to load profile data or profile not found.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [teacherIdFromUrl, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  if (error) {
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
            {error} Please ensure you are logged in correctly or try again later. 
            If the issue persists, contact administration.
            { (!teacherIdFromUrl || teacherIdFromUrl === "undefined") && <span> You can try to <Link href="/login/teacher" className="underline">login again</Link>.</span> }
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!profile) {
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
            Profile data could not be loaded.
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
          <CardTitle className="font-headline text-xl text-primary">{profile.name || "N/A"}</CardTitle>
          <CardDescription>Teacher Profile Details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
            <p className="text-foreground">{profile.name || "Not specified"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
            <p className="text-foreground">{profile.email || "Not specified"}</p>
          </div>
          {/* 
            Future sections like Change Password or other settings would go here.
            For now, we keep it simple as requested.
          */}
        </CardContent>
      </Card>
    </div>
  );
}

