
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle, AlertTriangle, Info } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData, TeacherDashboardAssignment, TeacherNotification } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";

const defaultResourcesText = `Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. 
Stay updated with notifications from the D.O.S. and ensure timely submission of grades. 
If you encounter any issues, please contact the administration.`;

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams?: { teacherId?: string; teacherName?: string };
}) {
  const teacherId = searchParams?.teacherId;
  const teacherNameFromParams = searchParams?.teacherName ? decodeURIComponent(searchParams.teacherName) : "Teacher";

  if (!teacherId) {
    return (
      <div className="space-y-8">
        <PageHeader
            title="Teacher Dashboard"
            description="Access Denied"
            icon={LayoutDashboard}
        />
        <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Authentication Error</UIAlertTitle>
            <AlertDescription>
                Teacher ID is missing. Please use the main portal to access the teacher section. <Link href="/" className="underline">Go to Portal</Link>.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  let dashboardData: TeacherDashboardData;
  let fetchError: string | null = null;

  try {
    dashboardData = await getTeacherDashboardData(teacherId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while loading dashboard data.";
    console.error(`CRITICAL_ERROR_TEACHER_DASHBOARD_FETCH for teacher ${teacherId}:`, error);
    fetchError = errorMessage;
    dashboardData = {
      assignments: [],
      notifications: [], 
      teacherName: teacherNameFromParams, // Use param as fallback
      resourcesText: "Could not load resources due to a critical error. Please contact an administrator."
    };
  }

  const assignments: TeacherDashboardAssignment[] = dashboardData.assignments || [];
  let notifications: TeacherNotification[] = [...(dashboardData.notifications || [])]; 
  const resourcesText = dashboardData.resourcesText || defaultResourcesText;
  const teacherDisplayName = dashboardData.teacherName || teacherNameFromParams;

  if (fetchError && !notifications.find(n => n.id === 'critical_error_dashboard_load')) {
     notifications.unshift({ 
       id: 'critical_error_dashboard_load', 
       message: `Failed to load essential dashboard content: ${fetchError}. Some information may be missing or outdated. Please try refreshing or contact support if the issue persists.`, 
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

      {notifications.find(n => n.id === 'critical_error_db_null' || n.id === 'critical_error_dashboard_load' || n.id === 'error_teacher_not_found' || n.id === 'processing_error_dashboard') && (
         <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <UIAlertTitle>Dashboard Loading Error</UIAlertTitle>
            <AlertDescription>
                {notifications.find(n => n.id === 'critical_error_db_null' || n.id === 'critical_error_dashboard_load' || n.id === 'error_teacher_not_found' || n.id === 'processing_error_dashboard')?.message}
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
                      <h3 className="font-semibold text-primary">{item.className} - {item.subjectName}</h3>
                      <p className="text-sm text-muted-foreground">
                        <CalendarClock className="inline-block mr-1 h-4 w-4" />
                        Next Deadline: {item.nextDeadlineInfo}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}`}>
                        <BookOpenCheck className="mr-2 h-4 w-4" /> Enter Marks
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-8 w-8 mb-2" />
                <p>No classes or subjects are currently assigned to you for the active term.</p>
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
              notifications.filter(n => !(n.id === 'critical_error_db_null' || n.id === 'critical_error_dashboard_load' || n.id === 'error_teacher_not_found' || n.id === 'processing_error_dashboard')).map((notification) => ( // Filter out already displayed critical errors
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
                  <p className="text-sm">{notification.message}</p>
                </div>
              ))
            ) : !fetchError ? ( // Only show "no new notifications" if there wasn't a major fetch error already displayed
              <div className="text-center py-6 text-muted-foreground">
                 <Info className="mx-auto h-8 w-8 mb-2" />
                <p>No new notifications at this time.</p>
              </div>
            ) : null}
            {notifications.length > 0 && !notifications.filter(n => !(n.id === 'critical_error_db_null' || n.id === 'critical_error_dashboard_load' || n.id === 'error_teacher_not_found' || n.id === 'processing_error_dashboard')).length && !fetchError && (
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
              {resourcesText.split('\n').map((paragraph, index) => (
                <p key={index} className="text-foreground/90 mb-2 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <Button variant="default" className="mt-4" asChild>
                <Link href={`/teacher/marks/submit?teacherId=${encodeURIComponent(teacherId)}`}>
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

    