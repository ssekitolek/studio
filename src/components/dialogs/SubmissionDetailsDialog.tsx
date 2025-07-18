
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { getSubmissionDetails } from "@/lib/actions/teacher-actions";
import { useToast } from "@/hooks/use-toast";
import type { MarkSubmissionFirestoreRecord } from "@/lib/types";

interface SubmissionDetailsDialogProps {
  submissionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionDetailsDialog({ submissionId, open, onOpenChange }: SubmissionDetailsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [submission, setSubmission] = React.useState<MarkSubmissionFirestoreRecord | null>(null);

  React.useEffect(() => {
    if (open && submissionId) {
      setIsLoading(true);
      async function fetchDetails() {
        try {
          const details = await getSubmissionDetails(submissionId);
          if (details) {
            setSubmission(details);
          } else {
            toast({ title: "Error", description: "Could not find submission details.", variant: "destructive" });
            onOpenChange(false);
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch submission details.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      }
      fetchDetails();
    }
  }, [open, submissionId, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogDescription>
            {submission ? submission.assessmentName : "Loading..."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : submission && submission.submittedMarks ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submission.submittedMarks.map((mark, index) => (
                  <TableRow key={index}>
                    <TableCell>{mark.studentId}</TableCell>
                    <TableCell>{mark.score ?? 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center p-8">No marks were found in this submission.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
