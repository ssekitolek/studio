
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, Users, BookUser, ClipboardList, Settings2, CalendarCheck2, AlertTriangle, UserPlus, PlusCircle, FileWarning, Loader2 } from "lucide-react";
import { getTeachers, getStudents, getClasses, getSubjects, getExams, getGeneralSettings, getTerms } from "@/lib/actions/dos-actions";
import type { Term, GeneralSettings, Teacher, Student, ClassInfo, Subject as SubjectType, Exam } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import Image from 'next/image';

const quickActions = [
  { label: "Add New Teacher", href: "/dos/teachers/new", icon: UserPlus },
  { label: "Register Student", href: "/dos/students/new", icon: UserPlus },
  { label: "Create New Class", href: "/dos/classes/new", icon: PlusCircle },
  { label: "Set Deadlines", href: "/dos/settings/general", icon: Settings2 },
];

function calculateDaysRemaining(deadline?: string): string {
  if (!deadline) return "Not set";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Past due";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days`;
}

interface DashboardData {
  teachers: Teacher[];
  students: Student[];
  classes: ClassInfo[];
  subjectsData: SubjectType[];
  exams: Exam[];
  generalSettings: GeneralSettings | null;
  terms: Term[];
}

export default function DosDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [teachers, students, classes, subjectsData, exams, generalSettings, terms] = await Promise.all([
          getTeachers(),
          getStudents(),
          getClasses(),
          getSubjects(),
          getExams(),
          getGeneralSettings(),
          getTerms(),
        ]);
        setData({ teachers, students, classes, subjectsData, exams, generalSettings, terms });
      } catch (error) {
        console.error("CRITICAL ERROR in DosDashboardPage data fetching:", error);
        setFetchError(`Dashboard loading failed: ${error instanceof Error ? error.message : String(error)}. Please check server logs and ensure Firebase services are reachable.`);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { teachers = [], students = [], classes = [], subjectsData = [], exams = [], generalSettings, terms = [] } = data || {};

  let currentGeneralSettings = generalSettings;

  if (fetchError && !currentGeneralSettings) {
    currentGeneralSettings = {
        defaultGradingScale: [{ grade: 'N/A', minScore: 0, maxScore: 0 }],
        markSubmissionTimeZone: 'UTC',
        currentTermId: undefined,
        globalMarksSubmissionDeadline: undefined,
        dosGlobalAnnouncementText: "Dashboard data could not be loaded due to an error.",
        dosGlobalAnnouncementType: "warning",
        dosGlobalAnnouncementImageUrl: undefined,
        teacherDashboardResourcesText: "Resources could not be loaded due to an error.",
        teacherDashboardResourcesImageUrl: undefined,
    };
  } else if (!currentGeneralSettings) {
      currentGeneralSettings = {
        defaultGradingScale: [{ grade: 'Error', minScore: 0, maxScore: 0 }],
        markSubmissionTimeZone: 'UTC',
        dosGlobalAnnouncementText: "Failed to load system settings. Dashboard may be incomplete.",
        dosGlobalAnnouncementType: "warning",
        teacherDashboardResourcesText: "Failed to load resources text due to settings issue.",
        dosGlobalAnnouncementImageUrl: undefined,
        teacherDashboardResourcesImageUrl: undefined,
    };
  }

  const totalTeachers = teachers.filter(t => t.role !== 'dos').length;
  const totalStudents = students.length;
  const totalClassesManaged = classes.length;
  const totalSubjectsCovered = subjectsData.length;

  let pendingSubmissionsCount = 0;
  let pendingSubmissionsDeadlineText = "Not set";
  let upcomingDeadlineAlertText = "No specific deadline set.";
  let upcomingDeadlineDaysRemaining = "";

  const currentTerm = currentGeneralSettings.currentTermId ? terms.find(t => t.id === currentGeneralSettings?.currentTermId) : null;

  if (currentTerm) {
    pendingSubmissionsCount = exams.filter(exam => exam.termId === currentTerm.id).length;
  }

  if (currentGeneralSettings.globalMarksSubmissionDeadline) {
    pendingSubmissionsDeadlineText = `Global: ${new Date(currentGeneralSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
    upcomingDeadlineAlertText = `Global marks submission deadline is approaching: ${new Date(currentGeneralSettings.globalMarksSubmissionDeadline).toLocaleDateString()}.`;
    upcomingDeadlineDaysRemaining = calculateDaysRemaining(currentGeneralSettings.globalMarksSubmissionDeadline);
  } else if (currentTerm?.endDate) {
    pendingSubmissionsDeadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
    upcomingDeadlineAlertText = `Current term submission deadline (term end): ${new Date(currentTerm.endDate).toLocaleDateString()}.`;
    upcomingDeadlineDaysRemaining = calculateDaysRemaining(currentTerm.endDate);
  }

  const stats = [
    { title: "Total Teachers", value: totalTeachers, icon: BookUser, description: "" },
    { title: "Total Students", value: totalStudents, icon: Users, description: "" },
    { title: "Classes Managed", value: totalClassesManaged, icon: ClipboardList, description: `Covering ${totalSubjectsCovered} subjects` },
    { title: "Pending Submissions", value: pendingSubmissionsCount, icon: CalendarCheck2, description: pendingSubmissionsDeadlineText },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="D.O.S. Dashboard"
        description="Overview of school activities and management tools."
        icon={LayoutDashboard}
      />
      {fetchError && (
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Dashboard Loading Error</ShadcnAlertTitle>
          <AlertDescription>
            {fetchError} Some data may be missing or outdated.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            className="shadow-md hover:shadow-lg transition-shadow"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Quick Actions</CardTitle>
            <CardDescription>Access common administrative tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Button key={action.label} variant="outline" asChild className="justify-start text-left h-auto py-3 hover:bg-accent/10">
                <Link href={action.href}>
                  <action.icon className="mr-3 h-6 w-6 text-primary" />
                  <div>
                    <span className="font-semibold">{action.label}</span>
                  </div>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              System Alerts
            </CardTitle>
            <CardDescription>Important notifications and system status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start p-3 bg-destructive/10 rounded-lg">
              <FileWarning className="h-5 w-5 text-yellow-600 mr-3 mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-700">Marks Anomaly Review</p>
                <p className="text-sm text-yellow-600/80">
                  Check for unusual grade patterns. <Link href="/dos/marks-review" className="underline hover:text-yellow-700">Review marks now</Link>.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-accent/10 rounded-lg">
                <CalendarCheck2 className="h-5 w-5 text-accent-foreground mr-3 mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-accent-foreground">Upcoming Deadline</p>
                <p className="text-sm text-accent-foreground/80">
                  {upcomingDeadlineAlertText} ({upcomingDeadlineDaysRemaining})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="md:w-2/3">
              {(currentGeneralSettings?.dosGlobalAnnouncementText || "Welcome to the D.O.S. Dashboard. Use the sidebar to manage school data. You can edit this message in General Settings.").split('\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground/90 mb-2 last:mb-0">
                      {paragraph}
                  </p>
              ))}
            </div>
            <div className="md:w-1/3 flex justify-center items-center">
                 <Image src={currentGeneralSettings?.dosGlobalAnnouncementImageUrl || "https://placehold.co/600x400.png"} alt="D.O.S. Dashboard Welcome Image" width={250} height={167} className="rounded-lg object-cover" data-ai-hint="education school"/>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
