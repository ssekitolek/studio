
import { getTeacherById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { TeacherForm } from "@/components/forms/TeacherForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EditTeacherPageProps {
  params: { teacherId: string };
}

export default async function EditTeacherPage({ params }: EditTeacherPageProps) {
  const teacher = await getTeacherById(params.teacherId);

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Teacher"
          description="Update teacher account and roles."
          icon={Edit3}
           actionButton={
            <Button variant="outline" asChild>
                <Link href="/dos/teachers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Teachers
                </Link>
            </Button>
           }
        />
        <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Teacher Not Found</AlertTitle>
            <AlertDescription>
            The teacher with ID "{params.teacherId}" could not be found. They may have been deleted or the ID is incorrect.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Teacher: ${teacher.name}`}
        description="Update teacher account and roles."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/teachers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teachers
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Teacher Form</CardTitle>
          <CardDescription>Modify the teacher's information for ID: {teacher.id}.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherForm initialData={teacher} teacherId={teacher.id} />
        </CardContent>
      </Card>
    </div>
  );
}
