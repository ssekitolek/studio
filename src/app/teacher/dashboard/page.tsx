
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BookOpenCheck, CalendarClock, Bell, ListChecks, AlertCircle, AlertTriangle, Info, BarChart3, BookCopy, CheckSquare, Loader2 } from "lucide-react";
import Image from "next/image";
import { getTeacherDashboardData } from "@/lib/actions/teacher-actions";
import type { TeacherDashboardData } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/StatCard";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getTeacherDashboardData(user.uid)
        .then(data => {
          setDashboardData(data);
        })
        .catch(error => {
          console.error("Failed to load teacher dashboard data:", error);
          // Handle error state if needed
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  if (isLoading || !dashboardData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Dashboard...</span>
      </div>
    );
  }

  const { assignments, notifications, teacherName, resourcesText, stats, resourcesImageUrl } = dashboardData;
  const displayTeacherName = teacherName || user?.displayName || user?.email || "Teacher";

  const dashboardStats = [
    { title: "Assigned Classes", value: stats.assignedClassesCount, icon: BookCopy, description: "Unique classes you manage." },
    { title: "Subjects Taught", value: stats.subjectsTaughtCount, icon: ListChecks, description: "Unique subjects you teach." },
    { title: "Recent Submissions", value: stats.recentSubmissionsCount ?? 'N/A', icon: CheckSquare, description: "Marks submitted in last 7 days." },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome back, ${displayTeacherName}!`}
        icon={LayoutDashboard}
      />
      
      {notifications.map(notification => (
         <Alert 
            variant={notification.type === 'warning' || notification.type === 'deadline' ? 'default' : 'default'} 
            className={`shadow-md ${
                notification.type === 'deadline' ? 'border-accent bg-accent/10' :
                notification.id.startsWith('error_') || notification.id.startsWith('critical_') || notification.type === 'warning' ? 'border-destructive bg-destructive/10' : 
                'border-blue-500 bg-blue-500/10' 
            }`} 
            key={notification.id}
        >
            {notification.type === 'warning' || notification.id.startsWith('error_') || notification.id.startsWith('critical_') ? <AlertTriangle className="h-4 w-4 text-destructive" /> : 
             notification.type === 'deadline' ? <AlertCircle className="h-4 w-4 text-accent" /> : 
             <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            }
            <UIAlertTitle 
                className={
                    notification.type === 'deadline' ? 'text-accent-foreground' :
                    notification.id.startsWith('error_') || notification.id.startsWith('critical_') || notification.type === 'warning' ? 'text-destructive-foreground' : 
                    'text-blue-700 dark:text-blue-300'
                }
            >
                {notification.id === 'dos_global_announcement' ? 'Global Announcement' :
                 notification.type === 'deadline' ? 'Upcoming Deadline' : 
                 notification.id.startsWith('error_') || notification.id.startsWith('critical_') || notification.type === 'warning' ? 'Important Alert' : 
                 notification.id.startsWith('system_settings_') || notification.id.startsWith('current_term_') ? 'System Configuration Alert' :
                 'Notification'}
            </UIAlertTitle>
            <AlertDescription 
                 className={
                    notification.type === 'deadline' ? 'text-accent-foreground/90' :
                    notification.id.startsWith('error_') || notification.id.startsWith('critical_') || notification.type === 'warning' ? 'text-destructive-foreground/90' : 
                    'text-blue-600 dark:text-blue-400'
                }
            >
                {notification.message}
            </AlertDescription>
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
              value={stat.value}
              icon={stat.icon}
              title={stat.title}
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
            <CardDescription>Your current teaching assignments and upcoming deadlines for the active term. Assessments that are pending D.O.S. review or approved will not appear here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments && assignments.length > 0 ? (
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
                      <Link href="/teacher/marks/submit">
                        <BookOpenCheck className="mr-2 h-4 w-4" /> Enter Marks
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-8 w-8 mb-2" />
                 <p>No classes or subjects are currently assigned to you for assessment submission in the active term.</p>
                 <p className="text-xs mt-1">This could be due to missing D.O.S. configurations (e.g., current term not set, or no exams for current term), or all your assigned marks have been submitted and are pending/approved. Check "View Submissions" for details on past submissions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <Bell className="mr-2 h-6 w-6" /> Teacher Resources
            </CardTitle>
            <CardDescription>Important updates and reminders from the D.O.S office.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="mb-4">
                 <Image src={resourcesImageUrl || "https://placehold.co/600x400.png"} alt="Teacher at desk" width={600} height={400} className="rounded-lg object-cover w-full h-auto" data-ai-hint="teacher classroom"/>
             </div>
             {(resourcesText || "No resources text available.").split('\n').map((paragraph, index) => (
                <p key={index} className="text-foreground/90 text-sm mb-2 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <Button variant="default" className="mt-4 w-full" asChild>
                 <Link href="/teacher/marks/submit">
                  <BookOpenCheck className="mr-2 h-4 w-4" /> Go to Marks Submission
                </Link>
              </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
