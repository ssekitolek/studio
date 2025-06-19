
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Exam } from "@/lib/types";
import { ExamTypeForm } from "@/components/forms/ExamTypeForm";
import { DeleteExamConfirmationDialog } from "@/components/dialogs/DeleteExamConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";

interface ExamEditViewProps {
  exam: Exam;
  showDeletePromptInitially: boolean;
}

export function ExamEditView({ exam, showDeletePromptInitially }: ExamEditViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(showDeletePromptInitially);
  const router = useRouter();

  useEffect(() => {
    setIsDeleteDialogOpen(showDeletePromptInitially);
  }, [showDeletePromptInitially]);

  const handleDialogClose = () => {
    setIsDeleteDialogOpen(false);
    if (router && exam?.id) {
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        if(currentSearchParams.get('action') === 'delete_prompt') {
             router.replace(`/dos/settings/exams/${exam.id}/edit`);
        }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeleteDialogOpen ? `Confirm Deletion: ${exam.name}` : `Edit Exam: ${exam.name}`}
        description={isDeleteDialogOpen ? "Please confirm you want to delete this exam type." : "Modify the definition of this examination type."}
        icon={isDeleteDialogOpen ? Trash2 : Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/settings/exams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams & Grading
            </Link>
          </Button>
        }
      />
      {isDeleteDialogOpen ? (
        <DeleteExamConfirmationDialog
          examId={exam.id}
          examName={exam.name}
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
            <CardTitle className="font-headline text-xl text-primary">Edit Exam Type Form</CardTitle>
            <CardDescription>Update the details for exam type "{exam.name}" (ID: {exam.id}).</CardDescription>
          </CardHeader>
          <CardContent>
            <ExamTypeForm examId={exam.id} initialData={exam} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
