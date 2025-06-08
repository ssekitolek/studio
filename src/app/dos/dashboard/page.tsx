
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, Users, BookUser, ClipboardList, Settings2, CalendarCheck2, AlertTriangle, UserPlus, PlusCircle, FileWarning } from "lucide-react";
import Image from "next/image";
import { getTeachers, getStudents, getClasses, getSubjects, getExams, getGeneralSettings, getTerms, getTermById } from "@/lib/actions/dos-actions";
import type { Term } from "@/lib/types";

const quickActions = [
  { label: "Add New Teacher", href: "/dos/teachers/new", icon: UserPlus },
  { label: "Register Student", href: "/dos/students/new", icon: UserPlus },
  { label: "Create New Class", href: "/dos/classes/new", icon: PlusCircle },
  { label: "Set Deadlines", href: "/dos/settings/general", icon: Settings2 },
];

function calculateDaysRemaining(deadline?: string): string {
  if (!deadline) return "Not set";
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0,0,0,0); // Normalize deadline to start of day

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Past due";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days`;
}

export default async function DosDashboardPage() {
  const [teachers, students, classes, subjectsData, exams, generalSettings, terms] = await Promise.all([
    getTeachers(),
    getStudents(),
    getClasses(),
    getSubjects(),
    getExams(),
    getGeneralSettings(),
    getTerms(),
  ]);

  const totalTeachers = teachers.length;
  const totalStudents = students.length;
  const totalClassesManaged = classes.length;
  const totalSubjectsCovered = subjectsData.length;

  let pendingSubmissionsCount = 0;
  let pendingSubmissionsDeadlineText = "Not set";
  let upcomingDeadlineAlertText = "No specific deadline set.";
  let upcomingDeadlineDaysRemaining = "";

  const currentTerm = generalSettings.currentTermId ? terms.find(t => t.id === generalSettings.currentTermId) : null;

  if (currentTerm) {
    pendingSubmissionsCount = exams.filter(exam => exam.termId === currentTerm.id).length;
  }
  
  if (generalSettings.globalMarksSubmissionDeadline) {
    pendingSubmissionsDeadlineText = `Global: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}`;
    upcomingDeadlineAlertText = `Global marks submission deadline is approaching: ${new Date(generalSettings.globalMarksSubmissionDeadline).toLocaleDateString()}.`;
    upcomingDeadlineDaysRemaining = calculateDaysRemaining(generalSettings.globalMarksSubmissionDeadline);
  } else if (currentTerm?.endDate) {
    pendingSubmissionsDeadlineText = `Term End: ${new Date(currentTerm.endDate).toLocaleDateString()}`;
    upcomingDeadlineAlertText = `Current term submission deadline (term end): ${new Date(currentTerm.endDate).toLocaleDateString()}.`;
    upcomingDeadlineDaysRemaining = calculateDaysRemaining(currentTerm.endDate);
  }


  const stats = [
    { title: "Total Teachers", value: totalTeachers, icon: BookUser, description: "" }, // Description can be dynamic later
    { title: "Total Students", value: totalStudents, icon: Users, description: "" },
    { title: "Classes Managed", value: totalClassesManaged, icon: ClipboardList, description: `Covering ${totalSubjectsCovered} subjects` },
    { title: "Pending Submissions", value: pendingSubmissionsCount, icon: CalendarCheck2, description: pendingSubmissionsDeadlineText },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="D.O.S. Dashboard"
        description="Overview of GradeCentral activities and management tools."
        icon={LayoutDashboard}
      />

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
            <CardTitle className="font-headline text-xl text-primary">Welcome to GradeCentral</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="md:w-2/3">
                <p className="text-foreground/90 mb-4">
                    GradeCentral empowers you to efficiently manage student grades, teacher assignments, and academic configurations. 
                    Utilize the sidebar to navigate through different management sections.
                </p>
                <p className="text-foreground/90">
                    This dashboard provides a quick overview and access to essential functions. Ensure all data is up-to-date for smooth operations.
                </p>
            </div>
            <div className="md:w-1/3 flex justify-center items-center">
                 <Image src="https://placehold.co/600x400.png" alt="Educational illustration" width={250} height={167} className="rounded-lg" data-ai-hint="education school" />
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
