
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
import { ShieldAlert, Loader2, CheckCircle, Search, FileWarning, Info, Download, ThumbsUp, ThumbsDown, Edit2 } from "lucide-react";
import { getClasses, getSubjects, getExams, getMarksForReview, approveMarkSubmission, rejectMarkSubmission, downloadSingleMarkSubmission, updateSubmittedMarksByDOS, getGradingPolicies, getGeneralSettings } from "@/lib/actions/dos-actions";
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import type { ClassInfo, Subject as SubjectType, Exam, AnomalyExplanation, GradeEntry as GenkitGradeEntry, GradingPolicy, GeneralSettings, GradingScaleItem } from "@/lib/types";
import type { MarksForReviewPayload, MarksForReviewEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const WHOLE_CLASS_VALUE = "_ALL_";

export default function MarksReviewPage() {
  const { toast } = useToast();
  const [isProcessingAnomalyCheck, startAnomalyCheckTransition] = useTransition();
  const [isUpdatingSubmission, startSubmissionUpdateTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isUpdatingMarks, startMarksUpdateTransition] = useTransition();

  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [gradingPolicies, setGradingPolicies] = useState<GradingPolicy[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedStream, setSelectedStream] = useState<string>(WHOLE_CLASS_VALUE);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);

  const [marksPayload, setMarksPayload] = useState<MarksForReviewPayload | null>(null);
  const [aiAnomalies, setAiAnomalies] = useState<AnomalyExplanation[]>([]);
  const [historicalAverage, setHistoricalAverage] = useState<number | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // For inline editing
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [editableMarks, setEditableMarks] = useState<MarksForReviewEntry[]>([]);
  
  const isAiConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY;


  useEffect(() => {
    async function fetchData() {
      setIsLoadingInitialData(true);
      try {
        const [classesData, subjectsData, examsData, policiesData, settingsData] = await Promise.all([
          getClasses(),
          getSubjects(),
          getExams(),
          getGradingPolicies(),
          getGeneralSettings(),
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
        setExams(examsData);
        setGradingPolicies(policiesData);
        setGeneralSettings(settingsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    const classInfo = classes.find(c => c.id === selectedClass);
    setAvailableStreams(classInfo?.streams || []);
    setSelectedStream(WHOLE_CLASS_VALUE);
  }, [selectedClass, classes]);

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
    setIsEditingMarks(false); // Reset editing state
    
    const streamToFetch = selectedStream === WHOLE_CLASS_VALUE ? undefined : selectedStream;
    console.log(`[MarksReviewPage] Fetching marks for Class: ${selectedClass}, Subject: ${selectedSubject}, Exam: ${selectedExam}, Stream: ${streamToFetch}`);
    try {
      const fetchedPayload = await getMarksForReview(selectedClass, selectedSubject, selectedExam, streamToFetch);
      setMarksPayload(fetchedPayload);
      if (fetchedPayload && fetchedPayload.marks) {
        setEditableMarks(JSON.parse(JSON.stringify(fetchedPayload.marks))); // Deep copy for editing
      } else {
        setEditableMarks([]);
      }
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

  const handleRunAnomalyCheck = async () => {
    if (!isAiConfigured) {
      toast({
        title: "AI Not Configured",
        description:
          "To use this feature, the NEXT_PUBLIC_GOOGLE_API_KEY must be set in your environment file.",
        variant: "destructive",
      });
      return;
    }

    if (!marksPayload?.submissionId || !marksPayload.exam || !marksPayload.subject || marksPayload.marks.length === 0) {
      toast({ title: "Cannot Run Check", description: "Load marks first and ensure exam/subject details are present before running the AI check.", variant: "destructive" });
      return;
    }

    const gradeEntries: GenkitGradeEntry[] = marksPayload.marks.map(m => ({ studentId: m.studentId, grade: m.grade }));
    const anomalyInput: GradeAnomalyDetectionInput = {
      subject: marksPayload.subject.name,
      exam: marksPayload.exam.name,
      grades: gradeEntries,
      historicalAverage: historicalAverage,
    };

    startAnomalyCheckTransition(async () => {
      try {
        const result = await gradeAnomalyDetection(anomalyInput);
        if (result.hasAnomalies) {
          setAiAnomalies(result.anomalies);
          toast({ title: "Anomalies Detected", description: "AI review found potential issues in the marks.", variant: "default", action: <FileWarning className="text-yellow-500"/> });
        } else {
          setAiAnomalies([]);
          toast({ title: "AI Check Complete", description: "No anomalies were detected by the AI review.", variant: "default", action: <CheckCircle className="text-green-500"/> });
        }
      } catch (error) {
        console.error("Manual anomaly detection error:", error);
        toast({ title: "AI Check Failed", description: `An error occurred: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
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
  
  const calculateGrade = (
    score: number | null,
    maxMarks: number,
    scale: GradingScaleItem[]
  ): string => {
    if (score === null || !maxMarks || !scale || scale.length === 0) return 'N/A';
    const percentage = (score / maxMarks) * 100;
    for (const tier of scale) {
      if (percentage >= tier.minScore && percentage <= tier.maxScore) {
        return tier.grade;
      }
    }
    return 'Ungraded';
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!marksPayload?.submissionId) {
        toast({ title: "Error", description: "No submission loaded to download.", variant: "destructive" });
        return;
    }

    startDownloadTransition(async () => {
        const currentExam = marksPayload.exam;
        if (!currentExam) {
             toast({ title: "Error", description: "Cannot download, exam details are missing from the submission.", variant: "destructive" });
             return;
        }
        const maxMarks = currentExam.maxMarks;

        let gradingScale: GradingScaleItem[] = [];
        if (currentExam?.gradingPolicyId && gradingPolicies) {
            const policy = gradingPolicies.find(p => p.id === currentExam.gradingPolicyId);
            if (policy?.scale) gradingScale = policy.scale;
        }
        if (gradingScale.length === 0 && generalSettings) {
            gradingScale = generalSettings.defaultGradingScale || [];
        }

        if (format === 'pdf') {
            try {
                const doc = new jsPDF();
                const assessmentName = marksPayload.assessmentName || 'Unnamed Assessment';
                const assessmentNameSlug = assessmentName.replace(/[^a-zA-Z0-9_]/g, '_');
                
                doc.setFontSize(18);
                doc.text(`Marks Submission Report`, 14, 22);
                doc.setFontSize(12);
                doc.text(assessmentName, 14, 30);
                
                doc.setFontSize(10);
                doc.text(`Submitted By: ${marksPayload.teacherName || 'N/A'}`, 14, 40);
                doc.text(`Submission ID: ${marksPayload.submissionId}`, 14, 46);
                doc.text(`D.O.S. Status: ${marksPayload.dosStatus || 'Pending'}`, 14, 52);

                const tableColumn = ["Student ID", "Student Name", "Score", "Grade"];
                const tableRows = marksPayload.marks.map(mark => [
                    mark.studentId,
                    mark.studentName,
                    mark.grade,
                    calculateGrade(mark.grade, maxMarks, gradingScale),
                ]);

                autoTable(doc, {
                    startY: 60,
                    head: [tableColumn],
                    body: tableRows as any,
                    theme: 'grid'
                });
                
                doc.save(`${assessmentNameSlug}_report.pdf`);
                toast({ title: "Download Started", description: "Your PDF report is being generated." });
            } catch(error) {
                 toast({ title: "Error", description: `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
            }

        } else if (format === 'xlsx') {
            try {
                const dataForSheet = marksPayload.marks.map(mark => ({
                  'Student ID': mark.studentId,
                  'Student Name': mark.studentName,
                  'Score': mark.grade,
                  'Grade': calculateGrade(mark.grade, maxMarks, gradingScale),
                }));
                
                const worksheet = XLSX.utils.json_to_sheet(dataForSheet);

                const colWidths = Object.keys(dataForSheet[0] || {}).map((key) => {
                    const maxLength = Math.max(
                        key.length,
                        ...dataForSheet.map(row => String(row[key as keyof typeof row] ?? "").length)
                    );
                    return { wch: maxLength + 2 };
                });
                worksheet['!cols'] = colWidths;
                
                const assessmentNameSlug = (marksPayload.assessmentName || "submission").replace(/[^a-zA-Z0-9_]/g, '_');
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Report');
                
                XLSX.writeFile(workbook, `${assessmentNameSlug}_report.xlsx`);
                
                toast({ title: "Download Started", description: "Your Excel report is being generated." });

            } catch (error) {
                toast({ title: "Error", description: `Client-side Excel generation failed: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
            }
        } else { // Handle CSV via server action
            try {
                const result = await downloadSingleMarkSubmission(marksPayload.submissionId!, format);
                if (result.success && result.data) {
                    const blobType = "text/csv;charset=utf-8;";
                    const assessmentNameSlug = (marksPayload.assessmentName || "submission").replace(/[^a-zA-Z0-9_]/g, '_');
                    const fileName = `${assessmentNameSlug}_report.csv`;
                    
                    const dataToUse = typeof result.data === 'string' ? new TextEncoder().encode(result.data) : result.data;
                    const blob = new Blob([dataToUse], { type: blobType });
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
        }
    });
  };

  const handleEditMarkChange = (studentId: string, newGrade: string) => {
    const trimmedGrade = newGrade.trim();
    if (trimmedGrade === "") {
        setEditableMarks(prev =>
            prev.map(mark => (mark.studentId === studentId ? { ...mark, grade: null } : mark))
        );
        return;
    }
    const newScore = parseFloat(trimmedGrade);
    if (!isNaN(newScore)) {
        setEditableMarks(prev =>
            prev.map(mark => (mark.studentId === studentId ? { ...mark, grade: newScore } : mark))
        );
    }
    // If it's not a number and not empty, do nothing, keeping the old value.
  };

  const handleSaveEditedMarks = () => {
    if (!marksPayload?.submissionId || !editableMarks) return;
    
    const currentExamDetails = marksPayload.exam;
    if (!currentExamDetails) {
        toast({ title: "Error", description: "Cannot save, exam details are missing.", variant: "destructive" });
        return;
    }
    const maxMarksForCurrentExam = currentExamDetails.maxMarks;

    const invalidScores = editableMarks.filter(mark => mark.grade !== null && (mark.grade < 0 || mark.grade > maxMarksForCurrentExam));
    if (invalidScores.length > 0) {
      toast({ title: "Invalid Scores", description: `One or more scores are outside the valid range (0-${maxMarksForCurrentExam}).`, variant: "destructive" });
      return;
    }

    startMarksUpdateTransition(async () => {
      const marksToUpdate = editableMarks.map(em => ({ studentId: em.studentId, score: em.grade }));
      const result = await updateSubmittedMarksByDOS(marksPayload.submissionId!, marksToUpdate);
      toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
      if (result.success) {
        setIsEditingMarks(false);
        handleFetchMarks(); // Refresh data
      }
    });
  };


  const currentMarks = marksPayload?.marks || [];
  const currentDosStatus = marksPayload?.dosStatus;
  const currentDosRejectReason = marksPayload?.dosRejectReason;

  const isActionDisabled = isProcessingAnomalyCheck || isLoadingMarks || isUpdatingSubmission || !marksPayload?.submissionId || isUpdatingMarks;
  const isSubmissionFinalized = currentDosStatus === 'Approved' || currentDosStatus === 'Rejected';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Review & Anomaly Detection"
        description="Review submissions, check for potential anomalies, and approve or reject marks."
        icon={ShieldAlert}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Selection Criteria</CardTitle>
          <CardDescription>Select class, subject, and exam to review the latest marks submitted by the teacher.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Class"} /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
           <Select value={selectedStream} onValueChange={setSelectedStream} disabled={!selectedClass || availableStreams.length === 0}>
            <SelectTrigger><SelectValue placeholder={availableStreams.length > 0 ? "Select Stream" : "No Streams"} /></SelectTrigger>
            <SelectContent>
                <SelectItem value={WHOLE_CLASS_VALUE}>Whole Class</SelectItem>
                {availableStreams.map(stream => <SelectItem key={stream} value={stream}>{stream}</SelectItem>)}
            </SelectContent>
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
              <Button onClick={handleRunAnomalyCheck} variant="outline" disabled={isActionDisabled || currentMarks.length === 0}>
                {isProcessingAnomalyCheck ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                Run AI Anomaly Check
              </Button>
              <Select onValueChange={(value: 'csv' | 'xlsx' | 'pdf') => handleDownload(value)} disabled={isDownloading || !marksPayload?.submissionId || currentMarks.length === 0}>
                  <SelectTrigger className="w-auto" disabled={isDownloading || !marksPayload?.submissionId || currentMarks.length === 0}>
                      <SelectValue placeholder={isDownloading ? "Downloading..." : "Download As"} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                  </SelectContent>
              </Select>
              {!isSubmissionFinalized && currentMarks.length > 0 && (
                <Button variant="outline" onClick={() => setIsEditingMarks(s => !s)} disabled={isActionDisabled}>
                  <Edit2 className="mr-2 h-4 w-4" /> {isEditingMarks ? "Cancel Edit" : "Edit Marks"}
                </Button>
              )}
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
                    {(isEditingMarks ? editableMarks : currentMarks).map((mark, index) => (
                    <TableRow key={`${mark.studentId}-${index}`}>
                        <TableCell>{mark.studentId}</TableCell>
                        <TableCell>{mark.studentName}</TableCell>
                        <TableCell className="text-right">
                        {isEditingMarks ? (
                            <Input
                            type="text"
                            value={mark.grade ?? ''}
                            onChange={(e) => handleEditMarkChange(mark.studentId, e.target.value)}
                            className="max-w-[100px] ml-auto text-right"
                            min="0"
                            max={marksPayload.exam?.maxMarks || 100}
                            disabled={isUpdatingMarks}
                            />
                        ) : (
                            mark.grade
                        )}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                 <p className="text-center text-muted-foreground py-8">No marks were part of this submission entry, or the submission was not found.</p>
            )}
          </CardContent>
          {isEditingMarks && currentMarks.length > 0 && !isSubmissionFinalized && (
            <CardContent className="border-t pt-4 flex justify-end">
              <Button onClick={handleSaveEditedMarks} disabled={isUpdatingMarks || isActionDisabled}>
                {isUpdatingMarks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Save Edited Marks
              </Button>
            </CardContent>
          )}
          {!isEditingMarks && currentMarks.length > 0 && !isSubmissionFinalized && ( 
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
      {isProcessingAnomalyCheck && (
         <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Checking for anomalies...</p>
          </div>
      )}
    </div>
  );
}
