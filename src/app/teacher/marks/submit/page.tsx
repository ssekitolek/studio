
"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { useSearchParams, useRouter } from "next/navigation";
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
  id: string;
  name: string;
  maxMarks: number;
}

export default function SubmitMarksPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentOption | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyExplanation[]>([]);
  const [showAnomalyWarning, setShowAnomalyWarning] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

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
    if (!searchParams) {
        setPageError("Could not access URL parameters. Please try reloading or logging in again.");
        setIsLoadingAssessments(false);
        return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl === "undefined") {
      const msg = `Teacher ID invalid or missing from URL (received: '${teacherIdFromUrl}'). Please login again to submit marks.`;
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setCurrentTeacherId(null);
      setIsLoadingAssessments(false); 
      return;
    }

    setCurrentTeacherId(teacherIdFromUrl);
    setPageError(null); 

    async function fetchAssessments(validTeacherId: string) {
      setIsLoadingAssessments(true);
      try {
        const assessmentData = await getTeacherAssessments(validTeacherId);
        setAssessments(assessmentData);
        if (assessmentData.length === 0) {
            toast({ title: "No Assessments", description: "No assessments found for your assignments in the current term. Please contact D.O.S if this is unexpected.", variant: "default" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ title: "Error Loading Assessments", description: errorMessage, variant: "destructive" });
        setPageError(`Failed to load assessments: ${errorMessage}`);
      } finally {
        setIsLoadingAssessments(false);
      }
    }
    fetchAssessments(teacherIdFromUrl);
  }, [searchParams, toast]);

  const handleAssessmentChange = async (assessmentId: string) => {
    form.setValue("assessmentId", assessmentId);
    const assessment = assessments.find(a => a.id === assessmentId);
    setSelectedAssessment(assessment || null);
    setAnomalies([]);
    setShowAnomalyWarning(false);
    form.resetField("marks", { defaultValue: [] }); 

    if (assessmentId && currentTeacherId) { 
      setIsLoadingStudents(true);
      try {
        const students: Student[] = await getStudentsForAssessment(assessmentId); 
        const marksData = students.map(student => ({
          studentId: student.studentIdNumber, 
          studentName: `${student.firstName} ${student.lastName}`,
          score: null, 
        }));
        replace(marksData); 
         if (students.length === 0) {
            toast({ title: "No Students", description: "No students found for the selected assessment. Please check class enrollment or contact D.O.S.", variant: "default" });
        }
      } catch (error) {
        toast({ title: "Error Loading Students", description: "Failed to load students for this assessment.", variant: "destructive" });
        replace([]); 
      } finally {
        setIsLoadingStudents(false);
      }
    } else {
      replace([]); 
      if(!currentTeacherId){
        toast({ title: "Authentication Error", description: "Teacher ID is missing or invalid. Cannot load students.", variant: "destructive" });
      }
    }
  };

  const onSubmit = async (data: MarksSubmissionFormValues) => {
    if (!selectedAssessment) {
        toast({ title: "Error", description: "No assessment selected.", variant: "destructive"});
        return;
    }
    if (!currentTeacherId) {
        toast({ title: "Authentication Error", description: "Teacher ID is missing or invalid. Please re-login.", variant: "destructive" });
        setPageError("Teacher ID is missing. Please login again.");
        return;
    }

    const marksToSubmit = data.marks.map(m => ({
        studentId: m.studentId,
        score: m.score
    })).filter(m => m.score !== null && m.score !== undefined && m.score.toString().trim() !== '');


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
        const result = await submitMarks(currentTeacherId, {
          assessmentId: data.assessmentId,
          marks: marksToSubmit as Array<{ studentId: string; score: number }>, 
        });
        if (result.success) {
          toast({
            title: result.anomalies?.hasAnomalies ? "Marks Submitted with Warnings" : "Success",
            description: result.message,
            variant: result.anomalies?.hasAnomalies ? "default" : "default",
            action: result.anomalies?.hasAnomalies ? <ShieldAlert className="text-yellow-500" /> : <CheckCircle className="text-green-500" />,
          });
          if (result.anomalies?.hasAnomalies) {
            setAnomalies(result.anomalies.anomalies);
            setShowAnomalyWarning(true);
          } else {
            setAnomalies([]);
            setShowAnomalyWarning(false);
            const currentAssessmentId = form.getValues("assessmentId");
            form.reset({ assessmentId: currentAssessmentId, marks: fields.map(f => ({...f, studentId: f.studentId, studentName: f.studentName, score: null})) });
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
              <FormField
                control={form.control}
                name="assessmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment</FormLabel>
                    <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            handleAssessmentChange(value);
                        }}
                        value={field.value}
                        disabled={isLoadingAssessments || !currentTeacherId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!currentTeacherId ? "Teacher ID missing" : isLoadingAssessments ? "Loading assessments..." : "Select an assessment"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assessments.map(assessment => (
                          <SelectItem key={assessment.id} value={assessment.id}>
                            {assessment.name} (Out of {assessment.maxMarks})
                          </SelectItem>
                        ))}
                         {assessments.length === 0 && !isLoadingAssessments && currentTeacherId && (
                            <div className="p-4 text-sm text-muted-foreground">No assessments available for the current term or your assignments.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <p className="mt-2">You can still proceed with this submission, or correct the marks and resubmit to clear these warnings.</p>
              </AlertDescription>
            </Alert>
          )}

          {selectedAssessment && fields.length > 0 && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || isLoadingStudents || isLoadingAssessments || !currentTeacherId} size="lg">
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

    
