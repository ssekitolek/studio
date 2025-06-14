
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle, AlertTriangle, Info } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";

export const dynamic = 'force-dynamic'; // Force dynamic rendering

const DEFAULT_TEACHER_ID = "default-teacher-for-open-access";
const DEFAULT_TEACHER_NAME = "Default Teacher";
const defaultResourcesText = `Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. 
Stay updated with notifications from the D.O.S. and ensure timely submission of grades. 
If you encounter any issues, please contact the administration.`;

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams?: { teacherId?: string; teacherName?: string };
}) {
  let teacherId: string;
  let teacherNameFromParams: string;

  if (!searchParams) {
    console.warn("[TeacherDashboardPage] searchParams object is undefined. Using default teacher ID and name.");
    teacherId = DEFAULT_TEACHER_ID;
    teacherNameFromParams = DEFAULT_TEACHER_NAME;
  } else if (!searchParams.teacherId) {
    console.warn(`[TeacherDashboardPage] teacherId is missing from searchParams. Using default teacher ID: ${DEFAULT_TEACHER_ID}. searchParams received:`, searchParams);
    teacherId = DEFAULT_TEACHER_ID;
    teacherNameFromParams = searchParams.teacherName ? decodeURIComponent(searchParams.teacherName) : DEFAULT_TEACHER_NAME;
  } else {
    teacherId = searchParams.teacherId;
    teacherNameFromParams = searchParams.teacherName ? decodeURIComponent(searchParams.teacherName) : "Teacher";
  }
  
  let dashboardData: TeacherDashboardData;
  let fetchError: string | null = null;

  try {
    dashboardData = await getTeacherDashboardData(teacherId);
    if (!dashboardData) {
        // This case should ideally be handled within getTeacherDashboardData to return a default structure
        console.error(`[TeacherDashboardPage] CRITICAL: getTeacherDashboardData returned null or undefined for teacherId: ${teacherId}`);
        throw new Error("Failed to retrieve dashboard data structure.");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while loading dashboard data.";
    console.error(`[TeacherDashboardPage] CRITICAL_ERROR_TEACHER_DASHBOARD_FETCH for teacher ${teacherId}:`, error);
    fetchError = errorMessage;
    // Initialize with a fully safe default structure
    dashboardData = {
      assignments: [],
      notifications: [], 
      teacherName: teacherNameFromParams, // Use param as fallback
      resourcesText: "Could not load resources due to a critical error. Please contact an administrator."
    };
  }

  // Ensure all potentially undefined properties are defaulted
  const assignments: TeacherDashboardAssignment[] = dashboardData.assignments || [];
  let notifications: TeacherNotification[] = [...(dashboardData.notifications || [])]; 
  const resourcesText = dashboardData.resourcesText || defaultResourcesText;
  const teacherDisplayName = dashboardData.teacherName || teacherNameFromParams;

  // Add fetchError to notifications if it exists and isn't already represented
  if (fetchError && !notifications.some(n => n.message.includes(fetchError!))) {
     notifications.unshift({ 
       id: 'critical_error_dashboard_load_page_level', 
       message: `Dashboard loading failed: ${fetchError}. Some information may be missing or outdated. Please try refreshing or contact support.`, 
       type: 'warning' 
      });
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back, ${teacherDisplayName}! Here's an overview of your tasks and classes.`}
        icon={LayoutDashboard}
      />

      {notifications.find(n => n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_')) && (
         <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Dashboard Loading Error</UIAlertTitle>
            <AlertDescription>
                {notifications.find(n => n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_'))?.message || "An unspecified error occurred while loading the dashboard."}
                 {!teacherId && <p className="mt-2">Teacher ID was not provided. Please use the main portal to access the teacher section. <Link href="/" className="underline">Go to Portal</Link>.</p>}
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Assigned Classes & Subjects
            </CardTitle>
            <CardDescription>Your current teaching assignments and upcoming deadlines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.length > 0 ? (
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
                      <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}&teacherName=${encodeURIComponent(teacherDisplayName)}`}>
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
            {notifications.length > 0 ? (
              notifications.filter(n => !(n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_'))).map((notification) => (
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
            ) : null }
            {notifications.filter(n => !(n.id.startsWith('critical_error_') || n.id.startsWith('error_') || n.id.startsWith('processing_error_'))).length === 0 && (
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
              {(resourcesText || defaultResourcesText).split('\n').map((paragraph, index) => (
                <p key={index} className="text-foreground/90 mb-2 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <Button variant="default" className="mt-4" asChild>
                <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}&teacherName=${encodeURIComponent(teacherDisplayName)}`}>
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
