
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Subject } from "@/lib/types";
import { SubjectForm } from "@/components/forms/SubjectForm";
import { DeleteSubjectConfirmationDialog } from "@/components/dialogs/DeleteSubjectConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";

interface SubjectEditViewProps {
  subject: Subject;
  showDeletePromptInitially: boolean;
}

export function SubjectEditView({ subject, showDeletePromptInitially }: SubjectEditViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(showDeletePromptInitially);
  const router = useRouter();

  useEffect(() => {
    setIsDeleteDialogOpen(showDeletePromptInitially);
  }, [showDeletePromptInitially]);

  const handleDialogClose = () => {
    setIsDeleteDialogOpen(false);
    if (router && subject?.id) {
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        if(currentSearchParams.get('action') === 'delete_prompt') {
             router.replace(`/dos/subjects/${subject.id}/edit`);
        }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeleteDialogOpen ? `Confirm Deletion: ${subject.name}` : `Edit Subject: ${subject.name}`}
        description={isDeleteDialogOpen ? "Please confirm you want to delete this subject." : "Modify the details of the selected subject."}
        icon={isDeleteDialogOpen ? Trash2 : Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes & Subjects
            </Link>
          </Button>
        }
      />
      {isDeleteDialogOpen ? (
        <DeleteSubjectConfirmationDialog
          subjectId={subject.id}
          subjectName={subject.name}
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
            <CardTitle className="font-headline text-xl text-primary">Edit Subject Form</CardTitle>
            <CardDescription>Update the information for subject "{subject.name}" (ID: {subject.id}).</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectForm subjectId={subject.id} initialData={subject} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
