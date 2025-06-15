
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
  
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    
    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl === "undefined" || teacherIdFromUrl.trim() === "") {
      const msg = `Teacher ID invalid or missing from URL (received: '${teacherIdFromUrl}'). Cannot load profile.`;
      setError(msg);
      setCurrentTeacherId(null);
      setIsLoading(false);
      return;
    }
    
    setCurrentTeacherId(teacherIdFromUrl);
    setError(null);
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await getTeacherProfileData(teacherIdFromUrl as string);
        if (data) {
          setProfile(data);
        } else {
          setError(`Failed to load profile data or profile not found for ID: ${teacherIdFromUrl}.`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [searchParams, router]);

  if (isLoading && !error) { // Show loader only if not already errored
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
            {error} 
            {(!currentTeacherId || currentTeacherId === "undefined") && <span> You can try to <Link href="/login/teacher" className="underline">login again</Link>.</span>}
            If the issue persists, contact administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!profile && !isLoading) { // Handles case where profile is null after loading and no error explicitly set from fetch
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
            {currentTeacherId && <span> (Attempted for ID: {currentTeacherId})</span>}
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
