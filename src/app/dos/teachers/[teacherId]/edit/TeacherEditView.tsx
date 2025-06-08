
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Teacher } from "@/lib/types";
import { TeacherForm } from "@/components/forms/TeacherForm";
import { DeleteTeacherConfirmationDialog } from "@/components/dialogs/DeleteTeacherConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";

interface TeacherEditViewProps {
  teacher: Teacher;
  showDeletePromptInitially: boolean;
}

export function TeacherEditView({ teacher, showDeletePromptInitially }: TeacherEditViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(showDeletePromptInitially);
  const router = useRouter();

  useEffect(() => {
    // Sync dialog state if the initial prop changes (e.g., browser back/forward)
    setIsDeleteDialogOpen(showDeletePromptInitially);
  }, [showDeletePromptInitially]);

  const handleDialogClose = () => {
    setIsDeleteDialogOpen(false);
    // If dialog was closed (e.g. by Cancel button or overlay click) and not via successful delete,
    // navigate to the clean edit URL to remove the ?action=delete_prompt param.
    // The successful delete case already navigates to /dos/teachers.
    if (router && teacher?.id) {
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        if(currentSearchParams.get('action') === 'delete_prompt') {
             router.replace(`/dos/teachers/${teacher.id}/edit`);
        }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeleteDialogOpen ? `Confirm Deletion: ${teacher.name}` : `Edit Teacher: ${teacher.name}`}
        description={isDeleteDialogOpen ? "Please confirm you want to delete this teacher." : "Update teacher account and roles."}
        icon={isDeleteDialogOpen ? Trash2 : Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/teachers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teachers
            </Link>
          </Button>
        }
      />
      {isDeleteDialogOpen ? (
        <DeleteTeacherConfirmationDialog
          teacherId={teacher.id}
          teacherName={teacher.name}
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleDialogClose(); // Handles closing via Cancel or overlay click
            } else {
              setIsDeleteDialogOpen(true); // Should generally not be re-opened this way by dialog itself
            }
          }}
        />
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Edit Teacher Form</CardTitle>
            <CardDescription>Modify the teacher's information for ID: {teacher.id}.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherForm initialData={teacher} teacherId={teacher.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
