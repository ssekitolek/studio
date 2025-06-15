
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle, AlertTriangle, Info, Loader2, BarChart3, BookCopy, CheckSquare } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData, TeacherNotification, TeacherStats } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/StatCard";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

const DEFAULT_FALLBACK_TEACHER_NAME = "Teacher"; 

export default function TeacherDashboardPage() {
  const searchParams = useSearchParams(); 
  const router = useRouter();
  
  const initialDefaultStats: TeacherStats = {
    assignedClassesCount: 0,
    subjectsTaughtCount: 0,
    recentSubmissionsCount: 0,
  };

  const initialDashboardData: TeacherDashboardData = {
    assignments: [],
    notifications: [],
    teacherName: undefined, 
    resourcesText: "Loading resources...",
    stats: initialDefaultStats,
  };

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData>(initialDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [currentTeacherName, setCurrentTeacherName] = useState<string>(DEFAULT_FALLBACK_TEACHER_NAME);

  useEffect(() => {
    if (!searchParams) {
      // This case should ideally not happen if useSearchParams is used correctly in a client component
      setIsLoading(false);
      setFetchError("Could not access URL parameters.");
      return;
    }

    const idFromParams = searchParams.get("teacherId");
    const nameFromUrl = searchParams.get("teacherName") 
      ? decodeURIComponent(searchParams.get("teacherName")!) 
      : DEFAULT_FALLBACK_TEACHER_NAME;

    setCurrentTeacherName(nameFromUrl); // Set name immediately for UI responsiveness

    if (!idFromParams || idFromParams === "undefined" || idFromParams.trim() === "") {
      const errorMessage = `Teacher ID is invalid or missing from URL (received: '${idFromParams}'). Dashboard cannot be loaded.`;
      console.warn(`[TeacherDashboardPage] ${errorMessage} (URL was: ${typeof window !== "undefined" ? window.location.href : "N/A"})`);
      setIsLoading(false);
      setFetchError(errorMessage);
      setDashboardData(prev => ({
          ...prev,
          notifications: [{id: 'error_invalid_id_param', message: errorMessage, type: 'warning'}],
          resourcesText: "Could not load resources due to invalid ID.",
          stats: initialDefaultStats,
          teacherName: nameFromUrl, // Keep the name from URL if available
      }));
      setCurrentTeacherId(null); // Ensure currentTeacherId is null
      // Optionally redirect
      // router.push("/login/teacher");
      return;
    }
    
    setCurrentTeacherId(idFromParams); // Set valid ID
    setIsLoading(true);
    setFetchError(null); 

    async function loadDataInternal(validTeacherId: string) {
      try {
        const data = await getTeacherDashboardData(validTeacherId);
        setDashboardData(data);
        if (!data.teacherName && !data.notifications.some(n => n.id === 'error_teacher_not_found')) {
           const newError = "Teacher record could not be loaded by the server, or data is incomplete.";
           setFetchError(prev => prev ? `${prev} ${newError}` : newError);
        } else if (data.notifications.some(n => n.id === 'error_teacher_not_found')) {
            setFetchError(data.notifications.find(n => n.id === 'error_teacher_not_found')?.message || "Teacher record could not be loaded.");
        }
      } catch (error) {
         const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred.";
         console.error(`[TeacherDashboardPage] CRITICAL_ERROR_FETCHING_DASHBOARD_DATA for teacher ${validTeacherId}:`, error);
         setFetchError(errorMessageText);
         setDashboardData({ 
             assignments: [],
             notifications: [{id: 'critical_fetch_error_page', message: `Failed to load dashboard: ${errorMessageText}`, type: 'warning'}],
             teacherName: nameFromUrl, 
             resourcesText: "Could not load resources due to an error.",
             stats: initialDefaultStats,
         });
      } finally {
        setIsLoading(false);
      }
    }

    loadDataInternal(idFromParams);

  }, [searchParams, router]); 


  const displayTeacherName = dashboardData.teacherName || currentTeacherName;
  const { assignments, notifications, resourcesText, stats } = dashboardData;

  const validEncodedTeacherId = currentTeacherId ? encodeURIComponent(currentTeacherId) : '';
  const validEncodedTeacherName = encodeURIComponent(displayTeacherName);

  if (isLoading && !fetchError) { // Show loader only if not already errored out due to invalid ID
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Dashboard for {displayTeacherName}...</p>
      </div>
    );
  }
  
  const dashboardStats = [
    { title: "Assigned Classes", value: stats.assignedClassesCount, icon: BookCopy, description: "Unique classes you manage." },
    { title: "Subjects Taught", value: stats.subjectsTaughtCount, icon: ListChecks, description: "Unique subjects you teach." },
    { title: "Recent Submissions", value: stats.recentSubmissionsCount, icon: CheckSquare, description: "Marks submitted in last 7 days." },
  ];

  const marksSubmissionLink = currentTeacherId 
    ? `/teacher/marks/submit?teacherId=${validEncodedTeacherId}&teacherName=${validEncodedTeacherName}`
    : "/login/teacher";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back, ${displayTeacherName}!`}
        icon={LayoutDashboard}
      />

      {fetchError && (
         <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Dashboard Loading Issue</UIAlertTitle>
            <AlertDescription>
                {fetchError} Some information may be missing or outdated. 
                {(!currentTeacherId || currentTeacherId === "undefined") && <span> Please try <Link href="/login/teacher" className="underline">logging in</Link> again.</span>}
            </AlertDescription>
        </Alert>
      )}
      
      {notifications.filter(n => n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_')).map(notification => (
         <Alert variant="destructive" className="shadow-md" key={notification.id}>
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Important Alert</UIAlertTitle>
            <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      ))}


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <BarChart3 className="mr-2 h-6 w-6" /> Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {dashboardStats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={currentTeacherId ? stat.value : 'N/A'}
              icon={stat.icon}
              description={stat.description}
              className="shadow-sm hover:shadow-md transition-shadow border"
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Assigned Classes & Subjects for Assessment
            </CardTitle>
            <CardDescription>Your current teaching assignments and upcoming deadlines for the active term.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTeacherId && assignments && assignments.length > 0 ? (
              assignments.map((item) => (
                <Card key={item.id} className="bg-secondary/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-primary">{item.className} - {item.subjectName} - {item.examName}</h3>
                      <p className="text-sm text-muted-foreground">
                        <CalendarClock className="inline-block mr-1 h-4 w-4" />
                        Next Deadline: {item.nextDeadlineInfo || "Not set"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={marksSubmissionLink}>
                        <BookOpenCheck className="mr-2 h-4 w-4" /> Enter Marks
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-8 w-8 mb-2" />
                 {currentTeacherId ? (
                  <>
                    <p>No classes or subjects are currently assigned to you for assessment in the active term, or data could not be loaded.</p>
                    <p className="text-xs mt-1">If you believe this is an error, please contact the D.O.S. office.</p>
                  </>
                 ) : (
                    <p>Cannot load assignments as Teacher ID is not available.</p>
                 )}
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
            {currentTeacherId && notifications && notifications.filter(n => !n.id.startsWith('critical_error_') && !n.id.startsWith('error_') && !n.id.startsWith('processing_error_')).length > 0 ? (
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
                    <p>{currentTeacherId ? "No new notifications at this time." : "Notifications cannot be loaded as Teacher ID is not available."}</p>
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
              <Button variant="default" className="mt-4" asChild disabled={!currentTeacherId}>
                 <Link href={marksSubmissionLink}>
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
