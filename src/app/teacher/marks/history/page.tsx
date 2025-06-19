
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Eye, Loader2, AlertTriangle, Info, FileWarning, CheckCircle2 } from "lucide-react";
import { getSubmittedMarksHistory } from "@/lib/actions/teacher-actions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SubmissionHistoryDisplayItem } from "@/lib/types";


export default function MarksHistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SubmissionHistoryDisplayItem[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
        setPageError("Could not access URL parameters. Please try reloading or logging in again.");
        setIsLoading(false);
        toast({ title: "Error", description: "URL parameters unavailable for history page.", variant: "destructive" });
        return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");
    console.log(`[MarksHistoryPage] teacherIdFromUrl from searchParams: '${teacherIdFromUrl}'`);


    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl.toLowerCase() === "undefined" || teacherIdFromUrl === "undefined") {
      const msg = `Teacher ID invalid or missing from URL (received: '${teacherIdFromUrl}'). Please login again to view history.`;
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setCurrentTeacherId(null);
      setIsLoading(false);
      return;
    }

    setCurrentTeacherId(teacherIdFromUrl);
    setPageError(null); 
    setIsLoading(true);

    async function fetchData(validTeacherId: string) {
        console.log(`[MarksHistoryPage] Fetching data for teacherId: ${validTeacherId}`);
        try {
            const submissionData = await getSubmittedMarksHistory(validTeacherId);
            console.log(`[MarksHistoryPage] Received ${submissionData.length} submission items from action for teacherId ${validTeacherId}.`);
            setHistory(submissionData);
            if (submissionData.length === 0 && !pageError) { 
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
            console.error(`[MarksHistoryPage] Error in fetchData for teacherId ${validTeacherId}:`, error);
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData(teacherIdFromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, toast]); // Removed pageError from deps for now.

  const getStatusVariantAndClass = (item: SubmissionHistoryDisplayItem): {variant: "default" | "destructive" | "secondary", className: string, icon?: React.ReactNode} => {
    // Prioritize D.O.S. status for display
    if (item.dosStatus === 'Approved') return { variant: "default", className: "bg-green-500 hover:bg-green-600 text-white", icon: <CheckCircle2 className="mr-1 inline-block h-3 w-3" /> };
    if (item.dosStatus === 'Rejected') return { variant: "destructive", className: "bg-red-500 hover:bg-red-600 text-white", icon: <AlertTriangle className="mr-1 inline-block h-3 w-3" /> };
    // If D.O.S. status is Pending, use the teacher-facing AI status for more nuance
    if (item.dosStatus === 'Pending') {
        if (item.status && (item.status.includes("Anomaly Detected") || item.status.includes("Anomaly)"))) { // Check for variations
             return { variant: "default", className: "bg-yellow-500 hover:bg-yellow-600 text-black", icon: <FileWarning className="mr-1 inline-block h-3 w-3" /> };
        }
        // If no anomaly detected by AI and D.O.S. status is pending
        return { variant: "secondary", className: "bg-blue-500 hover:bg-blue-600 text-white", icon: <Info className="mr-1 inline-block h-3 w-3" /> };
    }
    
    // Fallback to original status if dosStatus is somehow undefined or unexpected (should not happen with current logic)
    if (item.status && (item.status.includes("Anomaly Detected") || item.status.includes("Anomaly)"))) return { variant: "default", className: "bg-yellow-500 hover:bg-yellow-600 text-black", icon: <FileWarning className="mr-1 inline-block h-3 w-3" /> };
    if (item.status === "Accepted") return { variant: "secondary", className: "bg-gray-400 hover:bg-gray-500 text-white" }; // Should be rare if dosStatus is always set
    
    return { variant: "secondary", className: "bg-gray-400 hover:bg-gray-500 text-white" }; // Default fallback
  };


  if (pageError && !isLoading) {
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

  if (isLoading && currentTeacherId) { 
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

  if (!currentTeacherId && !isLoading && !pageError) {
     return (
      <div className="space-y-6">
        <PageHeader
          title="Marks Submission History"
          description="View your personal information."
          icon={History}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
             Teacher ID not found or invalid in URL. Please <Link href="/login/teacher" className="underline">login</Link> to view your submission history.
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
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
          {!isLoading && currentTeacherId && history.length > 0 ? (
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
                        <Button variant="outline" size="sm" className="mr-2" disabled>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
             !isLoading && currentTeacherId && history.length === 0 && !pageError && (
                <p className="text-center text-muted-foreground py-8">No submission history found for your account.</p>
             )
          )}
          {!isLoading && currentTeacherId && history.length === 0 && pageError && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading History</AlertTitle>
                <AlertDescription>
                    Could not load submission history. Please try again later or contact support.
                    Error: {pageError}
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {!isLoading && currentTeacherId && history.some(h => h.dosStatus === "Rejected") && (
         <Alert variant="destructive" className="border-red-500 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-headline text-red-700">Action Required</AlertTitle>
            <AlertDescription className="text-red-600">
            One or more of your submissions have been rejected by the D.O.S. Please review the rejection reasons. These assessments will reappear in your "Submit Marks" list for resubmission.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
