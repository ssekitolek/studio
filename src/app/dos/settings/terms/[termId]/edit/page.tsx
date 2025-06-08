
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle, CalendarDays } from "lucide-react";
import { TermForm } from "@/components/forms/TermForm";
import { getTermById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

export default async function EditTermPage({ params }: { params: { termId: string } }) {
  const termData = await getTermById(params.termId);

  if (!termData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Academic Term"
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
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Term Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The academic term with ID "{params.termId}" could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Term: ${termData.name}`}
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
          <CardDescription>Update the details for term "{termData.name}" (ID: {params.termId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <TermForm termId={params.termId} initialData={termData} />
        </CardContent>
      </Card>
    </div>
  );
}
