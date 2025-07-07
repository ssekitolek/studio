
"use client";

import * as React from "react";
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
import { deleteAllStudents } from "@/lib/actions/dos-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DeleteAllStudentsConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteAllStudentsConfirmationDialog({
  open,
  onOpenChange,
  onSuccess,
}: DeleteAllStudentsConfirmationDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmationText, setConfirmationText] = React.useState("");

  const handleDelete = async () => {
    if (confirmationText !== "DELETE") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "DELETE" to confirm.',
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      const result = await deleteAllStudents();
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };
  
  React.useEffect(() => {
    if (!open) {
      setConfirmationText("");
    }
  }, [open]);


  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            ARE YOU ABSOLUTELY SURE?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. You are about to delete <strong>ALL</strong> student records from the entire system. Please type <strong>DELETE</strong> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
            <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder='Type "DELETE" here'
                autoComplete="off"
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || confirmationText !== "DELETE"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Yes, delete all students
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
