
"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpenCheck, Loader2, AlertTriangle, CheckCircle, ShieldAlert, FileWarning } from "lucide-react";
import { getTeacherAssessments, getStudentsForAssessment, submitMarks } from "@/lib/actions/teacher-actions";
import type { Student, AnomalyExplanation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

const markSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  score: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().nullable().optional()
  ),
});

const marksSubmissionSchema = z.object({
  assessmentId: z.string().min(1, "Please select an assessment."),
  marks: z.array(markSchema),
});

type MarksSubmissionFormValues = z.infer<typeof marksSubmissionSchema>;

interface AssessmentOption {
  id: string; // Composite ID: examDocId_classDocId_subjectDocId
  name: string; // Human-readable name: Class Name - Subject Name - Exam Name
  maxMarks: number;
}

const ALL_STREAMS_VALUE = "_ALL_";

export default function SubmitMarksPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentOption | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyExplanation[]>([]);
  const [showAnomalyWarning, setShowAnomalyWarning] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>(ALL_STREAMS_VALUE);

  const form = useForm<MarksSubmissionFormValues>({
    resolver: zodResolver(marksSubmissionSchema),
    defaultValues: {
      assessmentId: "",
      marks: [],
    },
  });
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "marks",
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be determined

    if (!user) {
      setPageError("You must be logged in to view this page.");
      setIsLoadingAssessments(false);
      return;
    }

    setPageError(null); 

    async function fetchAssessments(teacherId: string) {
      setIsLoadingAssessments(true);
      try {
        const assessmentData = await getTeacherAssessments(teacherId);
        setAssessments(assessmentData);
        if (assessmentData.length === 0) { 
            toast({
                title: "No Assessments Available",
                description: "No pending assessments found for your assignments in the current term. This could be due to system settings (like current term) not being configured by the D.O.S., or all marks have been submitted and are pending/approved. Please check 'View Submissions' or contact administration if this is unexpected.",
                variant: "default",
                duration: 10000,
            });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ title: "Error Loading Assessments", description: errorMessage, variant: "destructive" });
        setPageError(`Failed to load assessments: ${errorMessage}`);
      } finally {
        setIsLoadingAssessments(false);
      }
    }
    fetchAssessments(user.uid);
  }, [user, authLoading, toast]);

  useEffect(() => {
    async function fetchStudentsForSelectedAssessment() {
      const assessmentId = form.getValues("assessmentId");
      if (assessmentId) {
        setIsLoadingStudents(true);
        const streamToFetch = selectedStream === ALL_STREAMS_VALUE ? undefined : selectedStream;
        try {
          const students: Student[] = await getStudentsForAssessment(assessmentId, streamToFetch);
          const marksData = students.map(student => ({
            studentId: student.studentIdNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            score: null,
          }));
          replace(marksData);
          if (students.length === 0) {
            toast({ title: "No Students Found", description: "No students found for the selected assessment and stream.", variant: "default" });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          toast({ title: "Error Loading Students", description: `Failed to load students: ${errorMsg}`, variant: "destructive" });
          replace([]);
        } finally {
          setIsLoadingStudents(false);
        }
      }
    }
    fetchStudentsForSelectedAssessment();
  }, [form.getValues("assessmentId"), selectedStream, replace, toast]);

  const handleAssessmentChange = async (assessmentId: string) => {
    form.setValue("assessmentId", assessmentId);
    const assessment = assessments.find(a => a.id === assessmentId);
    setSelectedAssessment(assessment || null);
    setAnomalies([]);
    setShowAnomalyWarning(false);
    replace([]); // Clear previous students

    if (assessmentId) {
      const classId = assessmentId.split('_')[1];
      // This part is difficult without changing the shape of getTeacherAssessments.
      // For now, stream filtering will rely on refetching students.
      setAvailableStreams([]); 
      setSelectedStream(ALL_STREAMS_VALUE);
    } else {
      replace([]);
    }
  };

  const onSubmit = async (data: MarksSubmissionFormValues) => {
    if (!selectedAssessment) {
        toast({ title: "Error", description: "No assessment selected.", variant: "destructive"});
        return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "Teacher ID is missing or invalid. Please re-login.", variant: "destructive" });
        setPageError("Teacher ID is missing. Please login again.");
        return;
    }

    const marksToSubmit = data.marks.map(m => ({
        studentId: m.studentId,
        score: m.score
    }));

    if (marksToSubmit.length === 0) {
        toast({ title: "No marks entered", description: "Please enter marks for at least one student.", variant: "destructive"});
        return;
    }

    let invalidScoreFound = false;
    data.marks.forEach((mark, index) => {
      if (mark.score !== null && mark.score !== undefined) {
        if (mark.score < 0 || mark.score > selectedAssessment.maxMarks) {
          form.setError(`marks.${index}.score`, {
            type: "manual",
            message: `Score must be between 0 and ${selectedAssessment.maxMarks}.`
          });
          invalidScoreFound = true;
        } else {
           form.clearErrors(`marks.${index}.score`);
        }
      }
    });

    if (invalidScoreFound) {
      toast({ title: "Invalid Scores", description: "Some scores are outside the valid range. Please correct them.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitMarks(user.uid, {
          assessmentId: data.assessmentId,
          marks: marksToSubmit as Array<{ studentId: string; score: number | null }>,
        });

        if (result.success) {
          if (result.anomalies?.hasAnomalies) {
            toast({
                title: "Marks Submitted with Warnings",
                description: "Potential anomalies were detected and have been flagged for D.O.S. review. Your marks have been recorded.",
                variant: "default",
                action: <ShieldAlert className="text-yellow-500" />,
                duration: 10000,
            });
            setAnomalies(result.anomalies.anomalies);
            setShowAnomalyWarning(true);
          } else {
            toast({
                title: "Marks Submitted Successfully!",
                description: "The D.O.S. has received them and they are pending review.",
                variant: "default",
                action: <CheckCircle className="text-green-500" />,
            });
            setAnomalies([]);
            setShowAnomalyWarning(false);
            
            if(user) {
                setIsLoadingAssessments(true);
                const updatedAssessments = await getTeacherAssessments(user.uid);
                setAssessments(updatedAssessments);
                setSelectedAssessment(null); 
                form.reset({ assessmentId: "", marks: [] }); 
                setIsLoadingAssessments(false);
                if (updatedAssessments.length === 0) {
                    toast({ title: "All Assessments Submitted", description: "No more pending assessments for this term.", variant: "default"});
                }
            }
          }
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (error) {
        const e = error as Error;
        toast({ title: "Submission Failed", description: e.message || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const currentMaxMarks = selectedAssessment?.maxMarks ?? 100;

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader
            title="Submit Marks"
            description="Error accessing this page."
            icon={BookOpenCheck}
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


  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Marks"
        description="Enter student marks for the selected assessment."
        icon={BookOpenCheck}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Select Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment</FormLabel>
                      <Select
                          onValueChange={(value) => handleAssessmentChange(value)}
                          value={field.value}
                          disabled={isLoadingAssessments || !user}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!user ? "Teacher ID missing" : isLoadingAssessments ? "Loading assessments..." : "Select an assessment"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingAssessments ? (
                              <div className="p-4 text-sm text-muted-foreground flex items-center justify-center">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...
                              </div>
                          ) : assessments.length > 0 ? (
                              assessments.map(assessment => (
                              <SelectItem key={assessment.id} value={assessment.id}>
                                  {assessment.name} (Out of {assessment.maxMarks})
                              </SelectItem>
                              ))
                          ) : (
                              <div className="p-4 text-sm text-muted-foreground text-center">
                                  No pending assessments available. This might be due to missing D.O.S. configurations (e.g., current term), or all marks are submitted and are pending/approved.
                                  <br />
                                  Please check "View Submissions" or contact administration if this is unexpected.
                              </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Stream (Optional)</FormLabel>
                  <Select
                    value={selectedStream}
                    onValueChange={setSelectedStream}
                    disabled={!selectedAssessment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Streams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STREAMS_VALUE}>All Streams</SelectItem>
                      {/* This needs to be populated based on the class from assessmentId */}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
            </CardContent>
          </Card>

          {selectedAssessment && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">Enter Marks for {selectedAssessment.name}</CardTitle>
                <CardDescription>Maximum possible score is {selectedAssessment.maxMarks}. Leave blank if no mark is awarded.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading students...</p>
                  </div>
                ) : fields.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Student ID</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-[150px] text-right">Score (0-{currentMaxMarks})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.studentId}</TableCell>
                            <TableCell>{item.studentName}</TableCell>
                            <TableCell className="text-right">
                              <FormField
                                control={form.control}
                                name={`marks.${index}.score`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder={`0-${currentMaxMarks}`}
                                        className="text-right"
                                        {...field}
                                        value={field.value === null || field.value === undefined ? '' : String(field.value)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(val === '' ? null : Number(val));
                                        }}
                                        min="0"
                                        max={currentMaxMarks}
                                        step="any"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs text-left" />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No students found for this assessment, or assessment not selected/valid.</p>
                )}
              </CardContent>
            </Card>
          )}

          {showAnomalyWarning && anomalies.length > 0 && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
              <FileWarning className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="font-headline text-yellow-700">Potential Anomalies Detected</AlertTitle>
              <AlertDescription className="text-yellow-600">
                The system found the following potential issues with the submitted marks. Please review:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {anomalies.map((anomaly, index) => (
                    <li key={index}>
                      <strong>Student {anomaly.studentId}:</strong> {anomaly.explanation}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">Your marks have been submitted with these warnings. You can correct the marks and resubmit, or the D.O.S. will review them as is.</p>
              </AlertDescription>
            </Alert>
          )}

          {selectedAssessment && fields.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || isLoadingStudents || isLoadingAssessments || !user}
                size="lg"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Submit Marks
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
