
"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Eye, Download, Loader2, AlertTriangle } from "lucide-react";
import { getSubmittedMarksHistory } from "@/lib/actions/teacher-actions"; // Assuming this exists
import { useToast } from "@/hooks/use-toast";

// Mock interface for submission history item
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
  const [isLoading, startLoadingTransition] = useTransition();
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);

  useEffect(() => {
    startLoadingTransition(async () => {
      try {
        // Teacher ID would come from auth in a real app
        const submissionData = await getSubmittedMarksHistory("teacher123"); 
        setHistory(submissionData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load submission history.", variant: "destructive" });
      }
    });
  }, [toast]);

  const getStatusVariant = (status: SubmissionHistoryItem['status']) => {
    if (status.includes("Anomaly Detected")) return "default"; // Default is primary, can be changed
    if (status === "Accepted") return "default"; // Or a success variant if you add one to Badge
    if (status === "Rejected") return "destructive";
    return "secondary";
  };

  if (isLoading && history.length === 0) {
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
          {history.length > 0 ? (
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
                      <Badge variant={getStatusVariant(item.status)} 
                             className={item.status.includes("Anomaly") ? "bg-yellow-500 hover:bg-yellow-600 text-black" : 
                                        item.status === "Accepted" ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="mr-2">
                        <Eye className="mr-1 h-4 w-4" /> View Details
                      </Button>
                      {/* <Button variant="outline" size="sm" disabled>
                        <Download className="mr-1 h-4 w-4" /> Download
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             !isLoading && <p className="text-center text-muted-foreground py-8">No submission history found.</p>
          )}
           {isLoading && history.length > 0 && ( // Show subtle loading if refreshing
            <div className="text-center text-muted-foreground py-4">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading more...
            </div>
           )}
        </CardContent>
      </Card>
        
      {history.some(h => h.status.includes("Anomaly Detected")) && (
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

    