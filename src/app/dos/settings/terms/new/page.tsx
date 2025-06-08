
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, ArrowLeft } from "lucide-react";

// This will eventually be a form component
// import { TermForm } from "@/components/forms/TermForm";

export default function AddNewTermPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Academic Term"
        description="Define a new term, its duration, and academic year."
        icon={CalendarDays}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/settings/terms">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Terms
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">New Term Form</CardTitle>
          <CardDescription>Specify the details for the new academic term.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for TermForm */}
          <p className="text-muted-foreground">Term creation form will be here.</p>
          {/* <TermForm /> */}
        </CardContent>
      </Card>
    </div>
  );
}
