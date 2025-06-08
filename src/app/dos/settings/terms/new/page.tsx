
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, ArrowLeft, CalendarPlus } from "lucide-react";
import { TermForm } from "@/components/forms/TermForm";

export default function AddNewTermPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Academic Term"
        description="Define a new term, its duration, and academic year."
        icon={CalendarPlus}
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
          <TermForm />
        </CardContent>
      </Card>
    </div>
  );
}
