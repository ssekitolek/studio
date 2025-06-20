
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
import { deleteStudent } from "@/lib/actions/dos-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteStudentConfirmationDialogProps {
  studentId: string; // Document ID of the student
  studentName: string; // Full name for display
  studentIdNumber: string; // Student's official ID number
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteStudentConfirmationDialog({
  studentId,
  studentName,
  studentIdNumber,
  open,
  onOpenChange,
}: DeleteStudentConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteStudent(studentId);
      if (result.success) {
        toast({
          title: "Student Deleted",
          description: `Student "${studentName}" (ID: ${studentIdNumber}) has been successfully deleted.`,
        });
        onOpenChange(false); 
        router.push("/dos/students"); 
        router.refresh(); 
      } else {
        toast({
          title: "Error Deleting Student",
          description: result.message || "Failed to delete student.",
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
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete the student: <strong>{studentName}</strong> (Student ID: {studentIdNumber}, Document ID: {studentId}). 
            This action cannot be undone. 
            <br />
            <strong className="text-destructive">Important:</strong> Deleting this student record does not automatically remove their associated marks or other historical data. Ensure this is the intended action.
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
            Delete Student
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

