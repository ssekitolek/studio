
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Eye, Loader2, AlertTriangle, Info, FileWarning, CheckCircle2 } from "lucide-react";
import { getSubmittedMarksHistory } from "@/lib/actions/teacher-actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import type { SubmissionHistoryDisplayItem } from "@/lib/types";
import { SubmissionDetailsDialog } from "@/components/dialogs/SubmissionDetailsDialog";

export default function MarksHistoryPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SubmissionHistoryDisplayItem[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth state

    if (!user) {
      setPageError("You must be logged in to view this page.");
      setIsLoading(false);
      return;
    }

    setPageError(null); 
    setIsLoading(true);

    async function fetchData(teacherId: string) {
      try {
        const submissionData = await getSubmittedMarksHistory(teacherId);
        setHistory(submissionData);
        if (submissionData.length === 0) { 
            toast({
              title: "No History Found",
              description: "You have not submitted any marks yet.",
              variant: "default",
              action: <Info className="text-blue-500" />
            });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ title: "Error Loading History", description: errorMessage, variant: "destructive" });
        setPageError(`Failed to load submission history: ${errorMessage}`);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData(user.uid);
  }, [user, authLoading, toast]); 

  const getStatusVariantAndClass = (item: SubmissionHistoryDisplayItem): {variant: "default" | "destructive" | "secondary", className: string, icon?: React.ReactNode} => {
    switch(item.dosStatus) {
        case 'Approved':
             return { variant: "default", className: "bg-green-500 hover:bg-green-600 text-white", icon: <CheckCircle2 className="mr-1 inline-block h-3 w-3" /> };
        case 'Rejected':
             return { variant: "destructive", className: "bg-red-500 hover:bg-red-600 text-white", icon: <AlertTriangle className="mr-1 inline-block h-3 w-3" /> };
        case 'Pending':
        default:
            return { variant: "secondary", className: "bg-blue-500 hover:bg-blue-600 text-white", icon: <Info className="mr-1 inline-block h-3 w-3" /> };
    }
  };


  if (pageError) {
     return (
      <div className="space-y-6">
        <PageHeader
            title="Marks Submission History"
            description="Access denied or error loading history."
            icon={History}
        />
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Error</AlertTitle>
            <AlertDescription>
                {pageError} You can try to <Link href="/login/teacher" className="underline">login again</Link>.
                If the issue persists, contact administration.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || authLoading) { 
    return (
      <div className="space-y-6">
          <PageHeader
            title="Marks Submission History"
            description="Review your past mark submissions and their statuses."
            icon={History}
          />
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading submission history...</p>
          </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Marks Submission History"
          description="Review your past mark submissions and their D.O.S. review statuses."
          icon={History}
        />

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Your Submissions</CardTitle>
            <CardDescription>
              A log of all marks you have submitted. Status reflects D.O.S. review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment Name</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Avg. Score</TableHead>
                    <TableHead className="text-center">D.O.S. Status</TableHead>
                    <TableHead>D.O.S. Reject Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const statusStyle = getStatusVariantAndClass(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.assessmentName || "N/A (Check Logs)"}</TableCell>
                        <TableCell>{new Date(item.dateSubmitted).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">{item.studentCount}</TableCell>
                        <TableCell className="text-center">{item.averageScore !== null ? item.averageScore.toFixed(1) : 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusStyle.variant} className={statusStyle.className}>
                            {statusStyle.icon}{item.status}
                          </Badge>
                        </TableCell>
                       <TableCell className="text-xs text-muted-foreground italic">
                          {item.dosRejectReason || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mr-2"
                            onClick={() => setSelectedSubmissionId(item.id)}
                          >
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
               <p className="text-center text-muted-foreground py-8">No submission history found for your account.</p>
            )}
          </CardContent>
        </Card>

        {history.some(h => h.dosStatus === "Rejected") && (
           <Alert variant="destructive" className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="font-headline text-red-700">Action Required</AlertTitle>
              <AlertDescription className="text-red-600">
              One or more of your submissions have been rejected by the D.O.S. Please review the rejection reasons. These assessments will reappear in your "Submit Marks" list for resubmission.
            </AlertDescription>
          </Alert>
        )}
      </div>
      {selectedSubmissionId && (
        <SubmissionDetailsDialog
          submissionId={selectedSubmissionId}
          open={!!selectedSubmissionId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSubmissionId(null);
            }
          }}
        />
      )}
    </>
  );
}
