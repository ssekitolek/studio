
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import Link from "next/link";

// Hardcoded values for direct access
const DEFAULT_TEACHER_ID = "default-teacher-for-open-access";
const DEFAULT_TEACHER_NAME = "Default Teacher";

export default function TeacherOpenAccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the teacher dashboard
    const teacherIdParam = encodeURIComponent(DEFAULT_TEACHER_ID);
    const teacherNameParam = encodeURIComponent(DEFAULT_TEACHER_NAME);
    router.replace(`/teacher/dashboard?teacherId=${teacherIdParam}&teacherName=${teacherNameParam}`);
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <User className="w-16 h-16 text-primary mb-3" />
          <CardTitle className="text-3xl font-headline">Teacher Portal Access</CardTitle>
          <CardDescription>Redirecting to the Teacher Dashboard...</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <p>Loading dashboard...</p>
          </div>
          <p className="text-sm text-muted-foreground">
            If you are not redirected automatically, please ensure JavaScript is enabled or{" "}
            <Link 
              href={`/teacher/dashboard?teacherId=${encodeURIComponent(DEFAULT_TEACHER_ID)}&teacherName=${encodeURIComponent(DEFAULT_TEACHER_NAME)}`} 
              className="underline hover:text-primary"
            >
              click here
            </Link>.
          </p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-primary">
              Back to main portal
            </Link>
          </p>
        </CardContent>
      </Card>
       <footer className="mt-12 text-center text-foreground/60">
        <p>&copy; {new Date().getFullYear()} GradeCentral. All rights reserved.</p>
        <p className="text-xs mt-1">Note: Teacher portal is in open access mode.</p>
      </footer>
    </main>
  );
}
