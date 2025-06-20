
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { getStudentById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import { StudentEditView } from "./StudentEditView"; // New component

interface EditStudentPageProps {
  params: { studentId: string };
  searchParams?: { action?: string };
}

export default async function EditStudentPage({ params, searchParams }: EditStudentPageProps) {
  const student = await getStudentById(params.studentId);
  const showDeletePrompt = searchParams?.action === 'delete_prompt';

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Student"
          description="Update the student's details."
          icon={Edit3}
          actionButton={
            <Button variant="outline" asChild>
              <Link href="/dos/students">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Student Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The student with ID "{params.studentId}" could not be found. They may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <StudentEditView student={student} showDeletePromptInitially={showDeletePrompt} />;
}

