
import { getTeacherById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { TeacherEditView } from "./TeacherEditView"; // Updated import

interface EditTeacherPageProps {
  params: { teacherId: string };
  searchParams?: { action?: string };
}

export default async function EditTeacherPage({ params, searchParams }: EditTeacherPageProps) {
  const teacher = await getTeacherById(params.teacherId);
  const showDeletePrompt = searchParams?.action === 'delete_prompt';

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

  return <TeacherEditView teacher={teacher} showDeletePromptInitially={showDeletePrompt} />;
}
