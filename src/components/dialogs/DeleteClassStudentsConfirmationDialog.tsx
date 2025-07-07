
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
import { deleteStudentsByClass } from "@/lib/actions/dos-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ClassInfo } from "@/lib/types";

interface DeleteClassStudentsConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classes: ClassInfo[];
}

export function DeleteClassStudentsConfirmationDialog({
  open,
  onOpenChange,
  onSuccess,
  classes,
}: DeleteClassStudentsConfirmationDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");

  const handleDelete = async () => {
    if (!selectedClassId) {
      toast({
        title: "No Class Selected",
        description: "Please select a class to delete students from.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      const result = await deleteStudentsByClass(selectedClassId);
      if (result.success) {
        toast({ title: "Success", description: result.message });
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
          setSelectedClassId("");
      }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Delete Students by Class
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete all student records from the selected class. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="class-select">Select Class</Label>
            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || !selectedClassId}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Students
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
