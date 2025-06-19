
"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Loader2, CheckCircle, Search, FileWarning, Info, Download, ThumbsUp, ThumbsDown } from "lucide-react";
import { getClasses, getSubjects, getExams, getMarksForReview, approveMarkSubmission, rejectMarkSubmission, downloadSingleMarkSubmission } from "@/lib/actions/dos-actions";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import type { ClassInfo, Subject as SubjectType, Exam, AnomalyExplanation, GradeEntry as GenkitGradeEntry } from "@/lib/types";
import type { MarksForReviewPayload } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function MarksReviewPage() {
  const { toast } = useToast();
  const [isProcessingAnomalyCheck, startAnomalyCheckTransition] = useTransition();
  const [isUpdatingSubmission, startSubmissionUpdateTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();

  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [marksPayload, setMarksPayload] = useState<MarksForReviewPayload | null>(null);
  const [aiAnomalies, setAiAnomalies] = useState<AnomalyExplanation[]>([]);
  const [historicalAverage, setHistoricalAverage] = useState<number | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);


  useEffect(() => {
    async function fetchData() {
      setIsLoadingInitialData(true);
      try {
        const [classesData, subjectsData, examsData] = await Promise.all([
          getClasses(),
          getSubjects(),
          getExams(),
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
        setExams(examsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleFetchMarks = async () => {
    if (!selectedClass || !selectedSubject || !selectedExam) {
      toast({ title: "Selection Missing", description: "Please select class, subject, and exam.", variant: "destructive" });
      return;
    }
    setIsLoadingMarks(true);
    setMarksPayload(null);
    setAiAnomalies([]);
    setShowRejectInput(false);
    setRejectReason("");
    console.log(`[MarksReviewPage] Fetching marks for Class: ${selectedClass}, Subject: ${selectedSubject}, Exam: ${selectedExam}`);
    try {
      const fetchedPayload = await getMarksForReview(selectedClass, selectedSubject, selectedExam);
      setMarksPayload(fetchedPayload);
      console.log(`[MarksReviewPage] Received payload:`, fetchedPayload);
      if (!fetchedPayload.submissionId || fetchedPayload.marks.length === 0) {
        toast({ title: "No Marks Found", description: "No marks data found for the selected criteria. This could mean no marks were submitted by the teacher yet, or the submission was empty.", variant: "default", action: <Info className="text-blue-500"/> });
      }
    } catch (error) {
      console.error("[MarksReviewPage] Error fetching marks for review:", error);
      toast({ title: "Error", description: `Failed to fetch marks: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    } finally {
      setIsLoadingMarks(false);
    }
  };

  const handleAnomalyCheck = async () => {
    if (!marksPayload?.submissionId || marksPayload.marks.length === 0) {
      toast({ title: "No Marks", description: "No marks loaded to check for anomalies.", variant: "destructive" });
      return;
    }

    const currentSubjectObj = subjects.find(s => s.id === selectedSubject);
    const currentExamObj = exams.find(e => e.id === selectedExam);

    if (!currentSubjectObj || !currentExamObj) {
        toast({ title: "Error", description: "Could not find subject or exam details for anomaly check.", variant: "destructive" });
        return;
    }

    const gradeEntries: GenkitGradeEntry[] = marksPayload.marks.map(m => ({ studentId: m.studentId, grade: m.grade }));

    const anomalyInput: GradeAnomalyDetectionInput = {
      subject: currentSubjectObj.name,
      exam: currentExamObj.name,
      grades: gradeEntries,
      historicalAverage: historicalAverage,
    };

    startAnomalyCheckTransition(async () => {
      try {
        const result = await gradeAnomalyDetection(anomalyInput);
        if (result.hasAnomalies) {
          setAiAnomalies(result.anomalies);
          toast({ title: "Anomalies Detected by D.O.S. Review", description: "Potential issues found in the marks.", variant: "default", action: <FileWarning className="text-yellow-500"/> });
        } else {
          setAiAnomalies([]);
          toast({ title: "No Anomalies Found by D.O.S. Review", description: "The marks appear consistent.", variant: "default", action: <CheckCircle className="text-green-500"/> });
        }
      } catch (error) {
        console.error("Anomaly detection error:", error);
        toast({ title: "Error", description: "Failed to perform anomaly detection.", variant: "destructive" });
      }
    });
  };

  const handleApprove = () => {
    if (!marksPayload?.submissionId) return;
    startSubmissionUpdateTransition(async () => {
      const result = await approveMarkSubmission(marksPayload.submissionId!);
      toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
      if (result.success) {
        handleFetchMarks(); 
      }
    });
  };

  const handleReject = () => {
    if (!marksPayload?.submissionId) return;
    if (!rejectReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    startSubmissionUpdateTransition(async () => {
      const result = await rejectMarkSubmission(marksPayload.submissionId!, rejectReason);
      toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
      if (result.success) {
        handleFetchMarks(); 
        setShowRejectInput(false);
        setRejectReason("");
      }
    });
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!marksPayload?.submissionId) {
        toast({ title: "Error", description: "No submission loaded to download.", variant: "destructive" });
        return;
    }
    startDownloadTransition(async () => {
      try {
        const result = await downloadSingleMarkSubmission(marksPayload.submissionId!, format);
        if (result.success && result.data) {
          let blobType: string;
          let fileName: string;
          const assessmentNameSlug = marksPayload.assessmentName?.replace(/[^a-zA-Z0-9_]/g, '_') || "submission";

          switch (format) {
            case "xlsx":
              blobType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
              fileName = `${assessmentNameSlug}.xlsx`;
              break;
            case "pdf": 
              blobType = "text/plain;charset=utf-8;"; 
              fileName = `${assessmentNameSlug}.txt`; 
              break;
            case "csv":
            default:
              blobType = "text/csv;charset=utf-8;";
              fileName = `${assessmentNameSlug}.csv`;
              break;
          }

          const blob = new Blob([result.data], { type: blobType });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "Download Started", description: result.message });

        } else {
          toast({ title: "Download Failed", description: result.message, variant: "destructive" });
        }
      } catch (error) {
         toast({ title: "Error", description: `Download failed: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      }
    });
  };

  const currentMarks = marksPayload?.marks || [];
  const currentDosStatus = marksPayload?.dosStatus;
  const currentDosRejectReason = marksPayload?.dosRejectReason;

  const isActionDisabled = isProcessingAnomalyCheck || isLoadingMarks || isUpdatingSubmission || !marksPayload?.submissionId;
  const isSubmissionFinalized = currentDosStatus === 'Approved' || currentDosStatus === 'Rejected';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Review & Anomaly Detection"
        description="Review submitted marks and use AI to detect potential anomalies. Approve or reject submissions."
        icon={ShieldAlert}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Selection Criteria</CardTitle>
          <CardDescription>Select class, subject, and exam to review the latest marks submitted by the teacher.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Class"} /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Subject"} /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedExam} onValueChange={setSelectedExam} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Exam"} /></SelectTrigger>
            <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
        <CardContent className="flex flex-col sm:flex-row justify-end gap-2">
            <Input
                type="number"
                placeholder="Optional: Historical Avg."
                className="max-w-xs"
                value={historicalAverage === undefined ? '' : historicalAverage}
                onChange={(e) => setHistoricalAverage(e.target.value ? parseFloat(e.target.value) : undefined)}
            />
            <Button
              onClick={handleFetchMarks}
              disabled={isLoadingInitialData || isLoadingMarks || !selectedClass || !selectedSubject || !selectedExam || isProcessingAnomalyCheck || isUpdatingSubmission}
              className="w-full sm:w-auto"
            >
                {isLoadingMarks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Load Submitted Marks
            </Button>
        </CardContent>
      </Card>

      {isLoadingMarks && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading submitted marks...</p>
        </div>
      )}

      {!isLoadingMarks && marksPayload && marksPayload.submissionId && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="font-headline text-xl text-primary">Latest Submitted Marks: {marksPayload.assessmentName || "N/A"}</CardTitle>
              <CardDescription>
                D.O.S. Status: <Badge variant={currentDosStatus === 'Approved' ? 'default' : currentDosStatus === 'Rejected' ? 'destructive' : 'secondary'} className={`${currentDosStatus === 'Approved' ? 'bg-green-500 text-white' : currentDosStatus === 'Rejected' ? 'bg-red-500 text-white' : '' } align-middle`}>{currentDosStatus || 'N/A'}</Badge>
                {currentDosStatus === 'Rejected' && currentDosRejectReason && <span className="text-xs italic ml-1"> Reason: {currentDosRejectReason}</span>}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={handleAnomalyCheck} disabled={isActionDisabled || isSubmissionFinalized || currentMarks.length === 0}>
                {isProcessingAnomalyCheck ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                AI Anomaly Check
                </Button>
                <Select onValueChange={(value: 'csv' | 'xlsx' | 'pdf') => handleDownload(value)} disabled={isDownloading || !marksPayload?.submissionId || currentMarks.length === 0}>
                    <SelectTrigger className="w-auto" disabled={isDownloading || !marksPayload?.submissionId || currentMarks.length === 0}>
                        <SelectValue placeholder={isDownloading ? "Downloading..." : "Download As"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        <SelectItem value="pdf">PDF (Basic Text)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            {currentMarks.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentMarks.map((mark, index) => (
                    <TableRow key={`${mark.studentId}-${index}`}>
                        <TableCell>{mark.studentId}</TableCell>
                        <TableCell>{mark.studentName}</TableCell>
                        <TableCell className="text-right">{mark.grade}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                 <p className="text-center text-muted-foreground py-8">No marks were part of this submission entry, or the submission was not found.</p>
            )}
          </CardContent>
          {currentMarks.length > 0 && ( 
            <CardContent className="border-t pt-4 space-y-3">
                <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => setShowRejectInput(s => !s)}
                        disabled={isActionDisabled || isSubmissionFinalized}
                    >
                        <ThumbsDown className="mr-2 h-4 w-4"/> {showRejectInput ? "Cancel Reject" : "Reject Submission"}
                    </Button>
                    <Button
                        onClick={handleApprove}
                        disabled={isActionDisabled || isSubmissionFinalized}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isUpdatingSubmission && currentDosStatus !== 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4"/>}
                        Approve Submission
                    </Button>
                </div>
                {showRejectInput && !isSubmissionFinalized && (
                    <div className="space-y-2 pt-2">
                        <Textarea
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[80px]"
                            disabled={isActionDisabled}
                        />
                        <Button onClick={handleReject} variant="destructive" disabled={isUpdatingSubmission || !rejectReason.trim() || isActionDisabled}>
                            {isUpdatingSubmission && currentDosStatus !== 'Rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsDown className="mr-2 h-4 w-4"/>}
                            Confirm Rejection
                        </Button>
                    </div>
                )}
            </CardContent>
          )}
        </Card>
      )}
      {!isLoadingMarks && !isLoadingInitialData && selectedClass && selectedSubject && selectedExam && (!marksPayload || !marksPayload.submissionId) && (
           <Card className="shadow-md">
             <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                    No marks submitted or found for the selected Class, Subject, and Exam.
                </p>
             </CardContent>
           </Card>
      )}

      {aiAnomalies.length > 0 && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
            <FileWarning className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-headline text-yellow-700">D.O.S. AI Anomaly Detection Results</AlertTitle>
            <AlertDescription className="text-yellow-600">
            The following potential issues were found by the AI review:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {aiAnomalies.map((anomaly, index) => (
                <li key={index}>
                  <strong>Student {anomaly.studentId}:</strong> {anomaly.explanation}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {isProcessingAnomalyCheck && aiAnomalies.length === 0 && (
         <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Checking for anomalies...</p>
          </div>
      )}
    </div>
  );
}
