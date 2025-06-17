
"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Eye, Loader2, AlertTriangle } from "lucide-react";
import { getSubmittedMarksHistory } from "@/lib/actions/teacher-actions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SubmissionHistoryItem {
  id: string;
  assessmentName: string;
  dateSubmitted: string;
  studentCount: number;
  averageScore: number | null;
  status: "Pending Review (Anomaly Detected)" | "Accepted" | "Rejected";
}

export default function MarksHistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter(); 

  const [isLoading, setIsLoading] = useState(true); 
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
        setPageError("Could not access URL parameters. Please try reloading or logging in again.");
        setIsLoading(false);
        toast({ title: "Error", description: "URL parameters unavailable.", variant: "destructive" });
        return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl.toLowerCase() === "undefined") {
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

    async function fetchData() {
        try {
            const submissionData = await getSubmittedMarksHistory(teacherIdFromUrl as string);
            setHistory(submissionData);
            if (submissionData.length === 0) {
                toast({ title: "No History", description: "No submission history found.", variant: "default" });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast({ title: "Error Loading History", description: errorMessage, variant: "destructive" });
            setPageError(`Failed to load submission history: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [searchParams, toast]); 

  const getStatusVariant = (status: SubmissionHistoryItem['status']) => {
    if (status.includes("Anomaly Detected")) return "default"; 
    if (status === "Accepted") return "default"; 
    if (status === "Rejected") return "destructive";
    return "secondary";
  };

  const getStatusClass = (status: SubmissionHistoryItem['status']) => {
    if (status.includes("Anomaly Detected")) return "bg-yellow-500 hover:bg-yellow-600 text-black";
    if (status === "Accepted") return "bg-green-500 hover:bg-green-600 text-white";
    return "bg-secondary hover:bg-secondary/80 text-secondary-foreground";
  }


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

  if (isLoading && currentTeacherId) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading submission history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Submission History"
        description="Review your past mark submissions and their statuses."
        icon={History}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Your Submissions</CardTitle>
          <CardDescription>
            A log of all marks you have submitted through the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentTeacherId && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Avg. Score</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.assessmentName}</TableCell>
                    <TableCell>{new Date(item.dateSubmitted).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">{item.studentCount}</TableCell>
                    <TableCell className="text-center">{item.averageScore !== null ? item.averageScore.toFixed(1) : 'N/A'}</TableCell>
                    <TableCell className="text-center">
                       <Badge variant={getStatusVariant(item.status)} className={getStatusClass(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="mr-2" disabled> 
                        <Eye className="mr-1 h-4 w-4" /> View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             !isLoading && currentTeacherId && <p className="text-center text-muted-foreground py-8">No submission history found.</p>
          )}
           {!currentTeacherId && !pageError && !isLoading && ( 
             <p className="text-center text-muted-foreground py-8">Teacher ID not found. Cannot load history.</p>
           )}
        </CardContent>
      </Card>

      {currentTeacherId && history.some(h => h.status.includes("Anomaly Detected")) && (
         <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-headline text-yellow-700">Review Required</AlertTitle>
            <AlertDescription className="text-yellow-600">
            Some of your submissions have potential anomalies flagged by the system.
            Please review them. The D.O.S. may also contact you regarding these.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

    
