
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardAssignment, TeacherNotification } from "@/lib/types";

const defaultResourcesText = `Access your teaching schedule, submit student marks, and view historical submission data using the sidebar navigation. 
Stay updated with notifications from the D.O.S. and ensure timely submission of grades. 
If you encounter any issues, please contact the administration.`;

export default async function TeacherDashboardPage() {
  // In a real app, teacherId would come from authentication.
  const teacherId = "teacher123"; // Placeholder for now
  const dashboardData = await getTeacherDashboardData(teacherId);
  const assignments: TeacherDashboardAssignment[] = dashboardData.assignments;
  const notifications: TeacherNotification[] = dashboardData.notifications;
  const resourcesText = dashboardData.resourcesText || defaultResourcesText;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back${dashboardData.teacherName ? `, ${dashboardData.teacherName}` : ''}! Here's an overview of your tasks and classes.`}
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Assigned Classes & Subjects
            </CardTitle>
            <CardDescription>Your current teaching assignments and upcoming deadlines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.map((item) => (
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
                    {/* Link might need to pass context if submit page can be pre-filled */}
                    <Link href="/teacher/marks/submit">
                      <BookOpenCheck className="mr-2 h-4 w-4" /> Enter Marks
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
             {assignments.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No classes assigned yet.</p>
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
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start p-3 rounded-lg ${
                  notification.type === 'deadline' ? 'bg-accent/10 text-accent-foreground' :
                  notification.type === 'warning' ? 'bg-destructive/10 text-destructive-foreground' :
                  'bg-blue-500/10 text-blue-700 dark:text-blue-300' // default to info style
                }`}
              >
                {notification.type === 'warning' || notification.type === 'deadline' ? (
                    <AlertCircle className={`h-5 w-5 mr-3 mt-0.5 shrink-0 ${notification.type === 'deadline' ? 'text-accent' : 'text-destructive' }`} />
                ): (
                    <Bell className="h-5 w-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                )}
                <p className="text-sm">{notification.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No new notifications.</p>
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
                <Link href="/teacher/marks/submit">
                  <BookOpenCheck className="mr-2 h-4 w-4" /> Go to Marks Submission
                </Link>
              </Button>
            </div>
            <div className="md:w-1/3 flex justify-center items-center">
                 <Image src="https://placehold.co/600x400.png" alt="Teacher at desk" width={250} height={167} className="rounded-lg" data-ai-hint="teacher classroom" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
