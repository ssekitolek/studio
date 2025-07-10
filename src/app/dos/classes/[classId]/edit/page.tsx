
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit3, ArrowLeft, AlertTriangle } from "lucide-react";
import { ClassForm } from "@/components/forms/ClassForm"; 
import { getClassById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

export default async function EditClassPage({ params }: { params: { classId: string } }) {
  const classData = await getClassById(params.classId);

  if (!classData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Class"
          description="Modify the details of the selected class."
          icon={Edit3}
          actionButton={
            <Button variant="outline" asChild>
              <Link href="/dos/classes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Classes
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Class Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The class with ID "{params.classId}" could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Class: ${classData.name}`}
        description="Modify the details of the selected class. Teacher and subject assignments are managed on the Teacher Assignments page."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Class Form</CardTitle>
          <CardDescription>Update the information for class {classData.name} (ID: {params.classId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm classId={params.classId} initialData={classData} />
        </CardContent>
      </Card>
    </div>
  );
}
