

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
import { getTeacherAssessments, getStudentsForAssessment, submitMarks, getClassesForTeacher } from "@/lib/actions/teacher-actions";
import type { Student, AnomalyExplanation, ClassInfo, Teacher } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getTeacherById as getTeacherByIdFromDOS } from '@/lib/actions/dos-actions';


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
  classId: z.string().min(1, "Please select a class for this submission."),
  marks: z.array(markSchema),
});

type MarksSubmissionFormValues = z.infer<typeof marksSubmissionSchema>;

interface AssessmentOption {
  id: string; // Just examDocId
  name: string; // Human-readable name: Exam Name (Subject Name - Class Name)
  maxMarks: number;
  subjectId: string;
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
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyExplanation[]>([]);
  const [showAnomalyWarning, setShowAnomalyWarning] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>(ALL_STREAMS_VALUE);

  const form = useForm<MarksSubmissionFormValues>({
    resolver: zodResolver(marksSubmissionSchema),
    defaultValues: {
      assessmentId: "",
      classId: "",
      marks: [],
    },
  });
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "marks",
  });

  const selectedClassId = form.watch("classId");

  useEffect(() => {
    if (authLoading) return;
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
            description: "No pending assessments found for your assignments in the current term.",
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
  
  const handleAssessmentChange = async (assessmentId: string) => {
    form.reset({ assessmentId, classId: "", marks: [] });
    const assessment = assessments.find(a => a.id === assessmentId);
    setSelectedAssessment(assessment || null);
    setAnomalies([]);
    setShowAnomalyWarning(false);
    
    if (assessment && user) {
        const teacher = await getTeacherByIdFromDOS(user.uid);
        if(teacher && teacher.subjectsAssigned) {
            const subjectAssignment = teacher.subjectsAssigned.find(sa => sa.subjectId === assessment.subjectId);
            if(subjectAssignment) {
                const allTeacherClasses = await getClassesForTeacher(user.uid, true); // Get all classes, even if not Class Teacher
                const classesForThisSubject = allTeacherClasses.filter(cls => subjectAssignment.classIds.includes(cls.id));
                setAvailableClasses(classesForThisSubject);

                // Auto-select class if only one option is available
                if (classesForThisSubject.length === 1) {
                  form.setValue('classId', classesForThisSubject[0].id);
                }
            } else {
                 setAvailableClasses([]);
            }
        }
    } else {
        setAvailableClasses([]);
    }
  };

  useEffect(() => {
    const classInfo = availableClasses.find(c => c.id === selectedClassId);
    setAvailableStreams(classInfo?.streams || []);
    setSelectedStream(ALL_STREAMS_VALUE);
  }, [selectedClassId, availableClasses]);


  useEffect(() => {
    async function fetchStudentsForSelectedClass() {
      if (selectedClassId) {
        setIsLoadingStudents(true);
        const streamToFetch = selectedStream === ALL_STREAMS_VALUE ? undefined : selectedStream;
        try {
          const students: Student[] = await getStudentsForAssessment(form.getValues('assessmentId'), streamToFetch);
          const marksData = students.map(student => ({
            studentId: student.studentIdNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            score: null,
          }));
          replace(marksData);
          if (students.length === 0) {
            toast({ title: "No Students Found", description: "No students found for the selected class and stream.", variant: "default" });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          toast({ title: "Error Loading Students", description: `Failed to load students: ${errorMsg}`, variant: "destructive" });
          replace([]);
        } finally {
          setIsLoadingStudents(false);
        }
      } else {
        replace([]);
      }
    }
    fetchStudentsForSelectedClass();
  }, [selectedClassId, selectedStream, replace, toast, form]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < fields.length) {
        const nextInput = document.getElementById(`mark-input-${nextIndex}`);
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        // Optionally, blur the last input or move focus to the submit button
        (event.target as HTMLInputElement).blur();
        document.getElementById('submit-marks-button')?.focus();
      }
    }
  };


  const onSubmit = async (data: MarksSubmissionFormValues) => {
    if (!selectedAssessment) {
        toast({ title: "Error", description: "No assessment selected.", variant: "destructive"});
        return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "Teacher ID is missing. Please re-login.", variant: "destructive" });
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
      toast({ title: "Invalid Scores", description: "Some scores are outside the valid range.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const compositeId = `${data.assessmentId}_${data.classId}_${selectedAssessment.subjectId}`;
        const result = await submitMarks(user.uid, {
          assessmentId: compositeId,
          marks: marksToSubmit as Array<{ studentId: string; score: number | null }>,
        });

        if (result.success) {
          toast({
              title: "Marks Submitted Successfully!",
              description: "The D.O.S. has received them for review.",
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
                form.reset({ assessmentId: "", classId: "", marks: [] }); 
                setAvailableClasses([]);
                setIsLoadingAssessments(false);
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
        <PageHeader title="Submit Marks" description="Error accessing this page." icon={BookOpenCheck} />
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Error</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Submit Marks" description="Enter student marks for the selected assessment." icon={BookOpenCheck} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Select Assessment & Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <SelectValue placeholder={!user ? "Teacher ID missing" : isLoadingAssessments ? "Loading..." : "Select an assessment"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {assessments.map(assessment => (
                              <SelectItem key={assessment.id} value={assessment.id}>
                                  {assessment.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedAssessment || availableClasses.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedAssessment ? "Select assessment first" : "Select class"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {availableClasses.map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                              </SelectItem>
                            ))}
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
                    disabled={!selectedClassId || availableStreams.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Streams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STREAMS_VALUE}>All Streams</SelectItem>
                      {availableStreams.map((stream) => (
                        <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
            </CardContent>
          </Card>

          {selectedClassId && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">Enter Marks for {availableClasses.find(c=>c.id === selectedClassId)?.name} {selectedStream !== ALL_STREAMS_VALUE ? `(${selectedStream} Stream)` : ''}</CardTitle>
                <CardDescription>Maximum possible score is {selectedAssessment?.maxMarks}. Leave blank if no mark is awarded.</CardDescription>
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
                                        id={`mark-input-${index}`}
                                        type="number"
                                        placeholder={`0-${currentMaxMarks}`}
                                        className="text-right"
                                        {...field}
                                        value={field.value === null || field.value === undefined ? '' : String(field.value)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(val === '' ? null : Number(val));
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
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
                  <p className="text-center text-muted-foreground py-8">No students found for this class.</p>
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
              </AlertDescription>
            </Alert>
          )}

          {selectedClassId && fields.length > 0 && (
            <div className="flex justify-end">
              <Button type="submit" id="submit-marks-button" disabled={isPending || isLoadingStudents} size="lg">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Submit Marks
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
