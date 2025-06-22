"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteSubject } from "@/lib/actions/dos-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteSubjectConfirmationDialogProps {
  subjectId: string;
  subjectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSubjectConfirmationDialog({
  subjectId,
  subjectName,
  open,
  onOpenChange,
}: DeleteSubjectConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteSubject(subjectId);
      if (result.success) {
        toast({
          title: "Subject Deleted",
          description: `Subject "${subjectName}" has been successfully deleted.`,
        });
        onOpenChange(false); 
        router.push("/dos/classes"); 
        router.refresh(); 
      } else {
        toast({
          title: "Error Deleting Subject",
          description: result.message || "Failed to delete subject.",
          variant: "destructive",
        });
        // Keep dialog open on error to allow user to see message or retry
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the subject: <strong>{subjectName}</strong> (ID: {subjectId}). 
            This action cannot be undone. 
            <br />
            <strong className="text-destructive">Important:</strong> If this subject is currently assigned to any classes, the system will prevent deletion. You must unassign it from all classes first. This action does not automatically handle historical data related to this subject.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Subject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
