
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { ExamTypeForm } from "@/components/forms/ExamTypeForm";
import { getExamById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

interface EditExamTypePageProps {
  params: { examId: string };
}

export default async function EditExamTypePage({ params: paramsInput }: EditExamTypePageProps) {
  const params = await paramsInput; // Ensure params are awaited
  const examData = await getExamById(params.examId);

  if (!examData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Exam Type"
          description="Modify the definition of this examination type."
          icon={Edit3}
          actionButton={
            <Button variant="outline" asChild>
              <Link href="/dos/settings/exams">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Exams & Grading
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Exam Type Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The exam type with ID "{params.examId}" could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Exam Type: ${examData.name}`}
        description="Modify the definition of this examination type."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/settings/exams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams & Grading
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Exam Type Form</CardTitle>
          <CardDescription>Update the details for exam type "{examData.name}" (ID: {params.examId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <ExamTypeForm examId={params.examId} initialData={examData} />
        </CardContent>
      </Card>
    </div>
  );
}
