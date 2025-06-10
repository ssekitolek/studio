
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit3, ArrowLeft, AlertTriangle } from "lucide-react";
import { SubjectForm } from "@/components/forms/SubjectForm";
import { getSubjectById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

interface EditSubjectPageProps {
  params: { subjectId: string };
}

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const subjectData = await getSubjectById(params.subjectId);

  if (!subjectData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Subject"
          description="Modify the details of the selected subject."
          icon={Edit3}
          actionButton={
            <Button variant="outline" asChild>
              <Link href="/dos/classes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes & Subjects
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Subject Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The subject with ID "{params.subjectId}" could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Subject: ${subjectData.name}`}
        description="Modify the details of the selected subject."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes & Subjects
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Subject Form</CardTitle>
          <CardDescription>Update the information for subject "{subjectData.name}" (ID: {params.subjectId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectForm subjectId={params.subjectId} initialData={subjectData} />
        </CardContent>
      </Card>
    </div>
  );
}
