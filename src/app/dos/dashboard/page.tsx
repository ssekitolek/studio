import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, Users, BookUser, ClipboardList, Settings2, CalendarCheck2, AlertTriangle, UserPlus, PlusCircle } from "lucide-react";
import Image from "next/image";

// Dummy data for demonstration
const stats = [
  { title: "Total Teachers", value: 15, icon: BookUser, description: "+2 this month" },
  { title: "Total Students", value: 320, icon: Users, description: "+15 this month" },
  { title: "Classes Managed", value: 12, icon: ClipboardList, description: "Covering 8 subjects" },
  { title: "Pending Submissions", value: 3, icon: CalendarCheck2, description: "Deadline: July 30th" },
];

const quickActions = [
  { label: "Add New Teacher", href: "/dos/teachers/new", icon: UserPlus },
  { label: "Register Student", href: "/dos/students/new", icon: UserPlus },
  { label: "Create New Class", href: "/dos/classes/new", icon: PlusCircle }, // Assuming /dos/classes/new path
  { label: "Set Deadlines", href: "/dos/settings/general", icon: Settings2 },
];

export default function DosDashboardPage() {
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
              <AlertTriangle className="inline-block mr-2 h-5 w-5 text-destructive" />
              System Alerts
            </CardTitle>
            <CardDescription>Important notifications and system status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive mr-3 mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-destructive-foreground">Marks Anomaly Detected</p>
                <p className="text-sm text-destructive-foreground/80">Unusual grade pattern in Form 2A Physics. <Link href="/dos/marks-review" className="underline hover:text-destructive-foreground">Review now</Link>.</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-accent/10 rounded-lg">
                <CalendarCheck2 className="h-5 w-5 text-accent-foreground mr-3 mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-accent-foreground">Upcoming Deadline</p>
                <p className="text-sm text-accent-foreground/80">Mid-term marks submission deadline is in 3 days.</p>
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
