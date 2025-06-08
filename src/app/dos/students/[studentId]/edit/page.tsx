
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { StudentRegistrationForm } from "@/components/forms/StudentRegistrationForm";
import { getStudentById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

export default async function EditStudentPage({ params }: { params: { studentId: string } }) {
  const student = await getStudentById(params.studentId);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Student: ${student.firstName} ${student.lastName}`}
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
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Student Form</CardTitle>
          <CardDescription>Modify the details for student {student.studentIdNumber} (ID: {params.studentId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentRegistrationForm initialData={student} studentDocumentId={params.studentId} />
        </CardContent>
      </Card>
    </div>
  );
}
