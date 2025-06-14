
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData, TeacherNotification } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';

const DEFAULT_FALLBACK_TEACHER_ID = "default-teacher-for-open-access"; // Used if teacherId is missing from params
const DEFAULT_FALLBACK_TEACHER_NAME = "Teacher"; // Used if teacherName is missing or decoding fails

export default function TeacherDashboardPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData>({
    assignments: [],
    notifications: [],
    teacherName: DEFAULT_FALLBACK_TEACHER_NAME,
    resourcesText: "Loading resources...",
  });

  let teacherId: string;
  let teacherNameFromParams: string;

  // Safely get teacherId and teacherName from searchParams
  try {
    const idFromParams = searchParams.get("teacherId");
    if (!idFromParams) {
      console.warn("[TeacherDashboardPage] teacherId is missing from searchParams. Using fallback.");
      teacherId = DEFAULT_FALLBACK_TEACHER_ID;
      if(!fetchError) setFetchError("Teacher ID not found in URL. Displaying default data if possible.");
    } else {
      teacherId = idFromParams;
    }

    const nameFromParams = searchParams.get("teacherName");
    if (!nameFromParams) {
      teacherNameFromParams = DEFAULT_FALLBACK_TEACHER_NAME;
    } else {
      try {
        teacherNameFromParams = decodeURIComponent(nameFromParams);
      } catch (e) {
        console.warn(`[TeacherDashboardPage] Failed to decode teacherName. Using fallback. Error: ${e}`, nameFromParams);
        teacherNameFromParams = DEFAULT_FALLBACK_TEACHER_NAME;
      }
    }
  } catch (e) {
    console.error("[TeacherDashboardPage] Error accessing searchParams:", e);
    teacherId = DEFAULT_FALLBACK_TEACHER_ID;
    teacherNameFromParams = DEFAULT_FALLBACK_TEACHER_NAME;
    if(!fetchError) setFetchError("Error reading URL parameters. Displaying default data if possible.");
  }


  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    async function loadData() {
      try {
        const data = await getTeacherDashboardData(teacherId);
        setDashboardData(data);
        if (data.teacherName === undefined && !data.notifications.some(n => n.id === 'error_teacher_not_found')) {
          // This case implies teacher was not found by getTeacherDashboardData, but it didn't add a notification for it.
          // This can happen if getTeacherByIdFromDOS itself returns null before getTeacherDashboardData can process.
          setFetchError(prev => prev ? `${prev} Teacher record could not be loaded.` : "Teacher record could not be loaded.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`[TeacherDashboardPage] CRITICAL_ERROR_FETCHING_DASHBOARD_DATA for teacher ${teacherId}:`, error);
        setFetchError(errorMessage);
        // Ensure dashboardData is reset to a safe default state on critical fetch error
        setDashboardData({
            assignments: [],
            notifications: [{id: 'critical_fetch_error_page', message: `Failed to load dashboard: ${errorMessage}`, type: 'warning'}],
            teacherName: teacherNameFromParams, // Use name from params as a fallback
            resourcesText: "Could not load resources due to an error."
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [teacherId, teacherNameFromParams]); // Rerun if teacherId changes

  const { assignments, notifications, teacherName, resourcesText } = dashboardData;
  const displayTeacherName = teacherName || teacherNameFromParams;


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back, ${displayTeacherName}! Here's an overview of your tasks and classes.`}
        icon={LayoutDashboard}
      />

      {fetchError && (
         <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Dashboard Loading Issue</UIAlertTitle>
            <AlertDescription>
                {fetchError} Some information may be missing or outdated.
            </AlertDescription>
        </Alert>
      )}
      
      {/* Display specific notifications from dashboardData that might indicate data loading issues */}
      {notifications.filter(n => n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_')).map(notification => (
         <Alert variant="destructive" className="shadow-md" key={notification.id}>
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Important Alert</UIAlertTitle>
            <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      ))}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Assigned Classes & Subjects
            </CardTitle>
            <CardDescription>Your current teaching assignments and upcoming deadlines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments && assignments.length > 0 ? (
              assignments.map((item) => (
                <Card key={item.id} className="bg-secondary/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-primary">{item.className || "N/A"} - {item.subjectName || "N/A"}</h3>
                      <p className="text-sm text-muted-foreground">
                        <CalendarClock className="inline-block mr-1 h-4 w-4" />
                        Next Deadline: {item.nextDeadlineInfo || "Not set"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}&teacherName=${encodeURIComponent(displayTeacherName)}`}>
                        <BookOpenCheck className="mr-2 h-4 w-4" /> Enter Marks
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-8 w-8 mb-2" />
                <p>No classes or subjects are currently assigned to you for the active term, or data could not be loaded.</p>
                <p className="text-xs mt-1">If you believe this is an error, please contact the D.O.S. office.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <Bell className="mr-2 h-6 w-6" /> Notifications
            </CardTitle>
            <CardDescription>Important updates and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {notifications && notifications.filter(n => !n.id.startsWith('critical_error_') && !n.id.startsWith('error_') && !n.id.startsWith('processing_error_')).length > 0 ? (
              notifications.filter(n => !n.id.startsWith('critical_error_') && !n.id.startsWith('error_') && !n.id.startsWith('processing_error_')).map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-3 rounded-lg ${
                    notification.type === 'deadline' ? 'bg-accent/10 text-accent-foreground' :
                    notification.type === 'warning' ? 'bg-destructive/10 text-destructive-foreground' :
                    'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {notification.type === 'warning' ? (
                      <AlertTriangle className={`h-5 w-5 mr-3 mt-0.5 shrink-0 text-destructive`} />
                  ): notification.type === 'deadline' ? (
                      <AlertCircle className={`h-5 w-5 mr-3 mt-0.5 shrink-0 text-accent`} />
                  ) : (
                      <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">{notification.message || "No message content."}</p>
                </div>
              ))
            ) : (
                <div className="text-center py-6 text-muted-foreground">
                    <Info className="mx-auto h-8 w-8 mb-2" />
                    <p>No new notifications at this time.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Teacher Resources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="md:w-2/3">
              {(resourcesText || "No resources text available.").split('\n').map((paragraph, index) => (
                <p key={index} className="text-foreground/90 mb-2 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <Button variant="default" className="mt-4" asChild>
                 <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}&teacherName=${encodeURIComponent(displayTeacherName)}`}>
                  <BookOpenCheck className="mr-2 h-4 w-4" /> Go to Marks Submission
                </Link>
              </Button>
            </div>
            <div className="md:w-1/3 flex justify-center items-center">
                 <Image src="https://placehold.co/600x400.png" alt="Teacher at desk" width={250} height={167} className="rounded-lg" data-ai-hint="teacher classroom"/>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
