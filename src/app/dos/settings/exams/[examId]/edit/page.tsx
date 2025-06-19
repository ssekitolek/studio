
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { getExamById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import { ExamEditView } from "./ExamEditView";

interface EditExamTypePageProps {
  params: { examId: string };
  searchParams?: { action?: string };
}

export default async function EditExamTypePage({ params, searchParams }: EditExamTypePageProps) {
  const examData = await getExamById(params.examId);
  const showDeletePrompt = searchParams?.action === 'delete_prompt';

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

  return <ExamEditView exam={examData} showDeletePromptInitially={showDeletePrompt} />;
}
