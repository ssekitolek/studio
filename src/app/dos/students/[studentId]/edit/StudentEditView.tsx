
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Student } from "@/lib/types";
import { StudentRegistrationForm } from "@/components/forms/StudentRegistrationForm";
import { DeleteStudentConfirmationDialog } from "@/components/dialogs/DeleteStudentConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";

interface StudentEditViewProps {
  student: Student;
  showDeletePromptInitially: boolean;
}

export function StudentEditView({ student, showDeletePromptInitially }: StudentEditViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(showDeletePromptInitially);
  const router = useRouter();

  useEffect(() => {
    setIsDeleteDialogOpen(showDeletePromptInitially);
  }, [showDeletePromptInitially]);

  const handleDialogClose = () => {
    setIsDeleteDialogOpen(false);
    if (router && student?.id) {
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        if(currentSearchParams.get('action') === 'delete_prompt') {
             router.replace(`/dos/students/${student.id}/edit`);
        }
    }
  };

  const studentFullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeleteDialogOpen ? `Confirm Deletion: ${studentFullName}` : `Edit Student: ${studentFullName}`}
        description={isDeleteDialogOpen ? "Please confirm you want to delete this student." : "Update the student's details."}
        icon={isDeleteDialogOpen ? Trash2 : Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/students">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Link>
          </Button>
        }
      />
      {isDeleteDialogOpen ? (
        <DeleteStudentConfirmationDialog
          studentId={student.id}
          studentName={studentFullName}
          studentIdNumber={student.studentIdNumber}
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleDialogClose();
            } else {
              setIsDeleteDialogOpen(true);
            }
          }}
        />
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Edit Student Form</CardTitle>
            <CardDescription>Modify the details for student {student.studentIdNumber} (Document ID: {student.id}).</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentRegistrationForm initialData={student} studentDocumentId={student.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
