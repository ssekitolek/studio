
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
import { deleteTeacherWithRole } from "@/lib/actions/dos-admin-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteTeacherConfirmationDialogProps {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteTeacherConfirmationDialog({
  teacherId,
  teacherName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTeacherConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteTeacherWithRole(teacherId);
      if (result.success) {
        toast({
          title: "Teacher Deleted",
          description: `Teacher "${teacherName}" has been successfully deleted.`,
        });
        onOpenChange(false);
        onSuccess(); // Callback to tell the parent page to refresh its data
      } else {
        toast({
          title: "Error Deleting Teacher",
          description: result.message || "Failed to delete teacher.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the teacher record for <strong>{teacherName}</strong>.
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
            Delete Teacher
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
