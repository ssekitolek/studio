
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
import { deleteGradingPolicy } from "@/lib/actions/dos-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteGradingPolicyConfirmationDialogProps {
  policyId: string;
  policyName: string;
  isDefault: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGradingPolicyConfirmationDialog({
  policyId,
  policyName,
  isDefault,
  open,
  onOpenChange,
}: DeleteGradingPolicyConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteGradingPolicy(policyId);
      if (result.success) {
        toast({
          title: "Grading Policy Deleted",
          description: `Policy "${policyName}" has been successfully deleted.`,
        });
        onOpenChange(false); 
        router.push("/dos/settings/exams"); 
        router.refresh(); 
      } else {
        toast({
          title: "Error Deleting Policy",
          description: result.message || "Failed to delete policy.",
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
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the <strong>{policyName}</strong> policy. If this policy is the default or assigned to any exams, the system will prevent deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || isDefault}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Policy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
