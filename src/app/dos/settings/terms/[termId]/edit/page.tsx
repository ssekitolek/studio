
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, ArrowLeft, Edit3 } from "lucide-react";

// This will eventually be a form component
// import { TermForm } from "@/components/forms/TermForm";

export default function EditTermPage({ params }: { params: { termId: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Academic Term ${params.termId}`}
        description="Modify the details of the academic term."
        icon={Edit3}
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
          <CardTitle className="font-headline text-xl text-primary">Edit Term Form</CardTitle>
          <CardDescription>Update the details for term {params.termId}.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for TermForm */}
          <p className="text-muted-foreground">Term editing form for ID: {params.termId} will be here.</p>
          {/* <TermForm termId={params.termId} /> */}
        </CardContent>
      </Card>
    </div>
  );
}
