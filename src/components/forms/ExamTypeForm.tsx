
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createExam, getTerms, updateExam, getClasses, getSubjects, getTeachers, getGradingPolicies } from "@/lib/actions/dos-actions";
import type { Term, Exam, ClassInfo, Subject, Teacher, GradingPolicy } from "@/lib/types";
import { Loader2, Save, PlusCircle, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const EMPTY_OPTION_VALUE = "_NONE_";

const examTypeFormSchema = z.object({
  name: z.string().min(3, "Exam name must be at least 3 characters."),
  termId: z.string().min(1, "Please select an academic term."),
  maxMarks: z.coerce.number().min(1, "Maximum marks must be at least 1.").max(1000, "Maximum marks seem too high."),
  description: z.string().optional(),
  examDate: z.date().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  stream: z.string().optional(),
  marksSubmissionDeadline: z.date().optional(),
  gradingPolicyId: z.string().optional(),
  category: z.string().optional(), // Added category field
}).refine(data => {
  if (data.classId && data.classId !== EMPTY_OPTION_VALUE && (!data.subjectId || data.subjectId === EMPTY_OPTION_VALUE)) {
    return false;
  }
  return true;
}, {
  message: "If a class is assigned, a subject must also be assigned.",
  path: ["subjectId"],
});

type ExamTypeFormValues = z.infer<typeof examTypeFormSchema>;

interface ExamTypeFormProps {
  initialData?: Exam | null;
  examId?: string;
  onSuccess?: () => void;
}

export function ExamTypeForm({ initialData, examId, onSuccess }: ExamTypeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [availableStreams, setAvailableStreams] = React.useState<string[]>([]);

  const [terms, setTerms] = React.useState<Term[]>([]);
  const [classes, setClasses] = React.useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [gradingPolicies, setGradingPolicies] = React.useState<GradingPolicy[]>([]);

  const isEditMode = !!examId && !!initialData;

  const form = useForm<ExamTypeFormValues>({
    resolver: zodResolver(examTypeFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      termId: initialData?.termId || "",
      maxMarks: initialData?.maxMarks || 100,
      description: initialData?.description || "",
      examDate: initialData?.examDate ? new Date(initialData.examDate) : undefined,
      classId: initialData?.classId || EMPTY_OPTION_VALUE,
      subjectId: initialData?.subjectId || EMPTY_OPTION_VALUE,
      teacherId: initialData?.teacherId || EMPTY_OPTION_VALUE,
      stream: initialData?.stream || EMPTY_OPTION_VALUE,
      marksSubmissionDeadline: initialData?.marksSubmissionDeadline ? new Date(initialData.marksSubmissionDeadline) : undefined,
      gradingPolicyId: initialData?.gradingPolicyId,
      category: initialData?.category || EMPTY_OPTION_VALUE,
    },
  });
  
  const selectedClassId = form.watch("classId");
  
  React.useEffect(() => {
    if (selectedClassId && selectedClassId !== EMPTY_OPTION_VALUE) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        setAvailableStreams(selectedClass?.streams || []);
    } else {
        setAvailableStreams([]);
        form.setValue("stream", EMPTY_OPTION_VALUE);
    }
  }, [selectedClassId, classes, form]);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [termsData, classesData, subjectsData, teachersData, policiesData] = await Promise.all([
          getTerms(),
          getClasses(),
          getSubjects(),
          getTeachers(),
          getGradingPolicies(),
        ]);
        setTerms(termsData);
        setClasses(classesData);
        setSubjects(subjectsData);
        setTeachers(teachersData.filter(t => t.role !== 'dos'));
        setGradingPolicies(policiesData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load supporting data (terms, classes, etc.).", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [toast]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        termId: initialData.termId,
        maxMarks: initialData.maxMarks,
        description: initialData.description || "",
        examDate: initialData.examDate ? new Date(initialData.examDate) : undefined,
        classId: initialData.classId || EMPTY_OPTION_VALUE,
        subjectId: initialData.subjectId || EMPTY_OPTION_VALUE,
        teacherId: initialData.teacherId || EMPTY_OPTION_VALUE,
        stream: initialData.stream || EMPTY_OPTION_VALUE,
        marksSubmissionDeadline: initialData.marksSubmissionDeadline ? new Date(initialData.marksSubmissionDeadline) : undefined,
        gradingPolicyId: initialData.gradingPolicyId,
        category: initialData.category || EMPTY_OPTION_VALUE,
      });
    }
  }, [initialData, form, isEditMode]);

  const onSubmit = (data: ExamTypeFormValues) => {
    startTransition(async () => {
      const examDataToSave = {
        ...data,
        examDate: data.examDate ? format(data.examDate, "yyyy-MM-dd") : undefined,
        marksSubmissionDeadline: data.marksSubmissionDeadline ? format(data.marksSubmissionDeadline, "yyyy-MM-dd") : undefined,
        classId: data.classId === EMPTY_OPTION_VALUE ? undefined : data.classId,
        subjectId: data.subjectId === EMPTY_OPTION_VALUE ? undefined : data.subjectId,
        teacherId: data.teacherId === EMPTY_OPTION_VALUE ? undefined : data.teacherId,
        stream: data.stream === EMPTY_OPTION_VALUE ? undefined : data.stream,
        gradingPolicyId: data.gradingPolicyId === EMPTY_OPTION_VALUE ? undefined : data.gradingPolicyId,
        category: data.category === EMPTY_OPTION_VALUE ? undefined : data.category,
      };

      try {
        if (isEditMode && examId) {
          const result = await updateExam(examId, examDataToSave as Partial<Omit<Exam, 'id'>>);
          if (result.success && result.exam) {
            toast({ title: "Exam Updated", description: `Exam "${result.exam.name}" updated successfully.` });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");
          } else {
             toast({ title: "Error Updating Exam", description: result.message || "Failed to update exam.", variant: "destructive" });
          }
        } else {
          const result = await createExam(examDataToSave as Omit<Exam, 'id'>);
          if (result.success && result.exam) {
            toast({
              title: "Exam Created",
              description: `Exam "${result.exam.name}" has been successfully created.`,
            });
            form.reset({ name: "", termId: "", maxMarks: 100, description: "", examDate: undefined, classId: EMPTY_OPTION_VALUE, subjectId: EMPTY_OPTION_VALUE, teacherId: EMPTY_OPTION_VALUE, stream: EMPTY_OPTION_VALUE, marksSubmissionDeadline: undefined, gradingPolicyId: undefined, category: EMPTY_OPTION_VALUE });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");
          } else {
            toast({
              title: "Error Creating Exam",
              description: result.message || "Failed to create exam.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ title: "Submission Error", description: errorMessage, variant: "destructive" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg text-primary">Core Exam Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Exam Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Midterm Exam, Final Assessment" {...field} />
                        </FormControl>
                        <FormDescription>The name of this examination.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="termId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Academic Term</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={isLoadingData ? "Loading terms..." : "Select a term"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {!isLoadingData && terms.map(term => (
                            <SelectItem key={term.id} value={term.id}>{term.name} ({term.year})</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormDescription>Associate this exam with an academic term.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maxMarks"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Maximum Marks</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormDescription>The default maximum score for this exam.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Exam Category (for Report Cards)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || EMPTY_OPTION_VALUE}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category"/>
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value={EMPTY_OPTION_VALUE}>General/Uncategorized</SelectItem>
                            <SelectItem value="Formative">Formative Assessment (AOI)</SelectItem>
                            <SelectItem value="Summative">Summative Assessment (EOT)</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormDescription>Classify the exam for correct report card placement.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="examDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Exam Date (Optional)</FormLabel>
                        <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                            placeholder="Select exam date"
                        />
                        <FormDescription>The specific date of this exam, if applicable.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="gradingPolicyId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Grading Policy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={isLoadingData ? "Loading policies..." : "Select a grading policy"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {!isLoadingData && gradingPolicies.map(policy => (
                                <SelectItem key={policy.id} value={policy.id}>
                                    {policy.name} {policy.isDefault && "(Default)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormDescription>Select a specific grading scale for this exam, or use the system-wide default.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Provide a brief description or any specific instructions for this exam."
                            className="resize-none"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg text-primary">Optional Assignment & Deadline</CardTitle>
            <FormDescription>Assign this exam to a specific context and set a marks submission deadline.</FormDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign to Class (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || EMPTY_OPTION_VALUE} disabled={isLoadingData}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingData ? "Loading..." : "None (General Exam)"} /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value={EMPTY_OPTION_VALUE}>None (General Exam)</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign to Subject (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || EMPTY_OPTION_VALUE} disabled={isLoadingData || !form.watch("classId") || form.watch("classId") === EMPTY_OPTION_VALUE}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingData ? "Loading..." : "None"} /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value={EMPTY_OPTION_VALUE}>None</SelectItem>
                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.code && `(${s.code})`}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormDescription>If a class is selected, subject is required.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="stream"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign to Stream (Optional)</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value || EMPTY_OPTION_VALUE} disabled={!selectedClassId || selectedClassId === EMPTY_OPTION_VALUE || availableStreams.length === 0}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={availableStreams.length > 0 ? "All Streams" : "No streams for this class"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value={EMPTY_OPTION_VALUE}>All Streams</SelectItem>
                                {availableStreams.map((stream) => (
                                    <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>Assign exam to a specific stream within the class.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="teacherId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign to Teacher (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || EMPTY_OPTION_VALUE} disabled={isLoadingData}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingData ? "Loading..." : "None"} /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value={EMPTY_OPTION_VALUE}>None</SelectItem>
                            {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="marksSubmissionDeadline"
                    render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                        <FormLabel>Marks Submission Deadline (Optional)</FormLabel>
                        <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                            placeholder="Select deadline"
                        />
                        <FormDescription>Overrides general term/global deadlines for this specific exam.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingData} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
               <Edit3 className="mr-2 h-4 w-4" />
            ): (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Exam" : "Create Exam"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
