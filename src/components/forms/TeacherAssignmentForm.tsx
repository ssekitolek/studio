
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { updateTeacherAssignments, getExams } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo, Exam as ExamType } from "@/lib/types";
import { Loader2, Save, Users, BookOpen } from "lucide-react";

const specificSubjectAssignmentSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  examIds: z.array(z.string()), // examIds is an array of exam type IDs
});

const teacherAssignmentFormSchema = z.object({
  classTeacherForClassIds: z.array(z.string()),
  specificSubjectAssignments: z.array(specificSubjectAssignmentSchema),
});

type TeacherAssignmentFormValues = z.infer<typeof teacherAssignmentFormSchema>;

interface TeacherAssignmentFormProps {
  teacher: Teacher;
  allClasses: ClassInfo[];
  onSuccess?: () => void;
}

export function TeacherAssignmentForm({
  teacher,
  allClasses,
  onSuccess,
}: TeacherAssignmentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [allExams, setAllExams] = React.useState<ExamType[]>([]);
  const [isLoadingExams, setIsLoadingExams] = React.useState(true);

  const form = useForm<TeacherAssignmentFormValues>({
    resolver: zodResolver(teacherAssignmentFormSchema),
    defaultValues: {
      classTeacherForClassIds: allClasses
        .filter((cls) => cls.classTeacherId === teacher.id)
        .map((cls) => cls.id),
      specificSubjectAssignments: teacher.subjectsAssigned?.map(sa => ({
        classId: sa.classId,
        subjectId: sa.subjectId,
        examIds: Array.isArray(sa.examIds) ? sa.examIds : []
      })) || [],
    },
  });
  
  React.useEffect(() => {
    async function fetchExamsData() {
      setIsLoadingExams(true);
      try {
        const examsData = await getExams();
        setAllExams(examsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load exam types.", variant: "destructive" });
      } finally {
        setIsLoadingExams(false);
      }
    }
    fetchExamsData();
  }, [toast]);

  React.useEffect(() => {
    form.reset({
      classTeacherForClassIds: allClasses
        .filter((cls) => cls.classTeacherId === teacher.id)
        .map((cls) => cls.id),
      specificSubjectAssignments: teacher.subjectsAssigned?.map(sa => ({
        classId: sa.classId,
        subjectId: sa.subjectId,
        examIds: Array.isArray(sa.examIds) ? sa.examIds : []
      })) || [],
    });
  }, [teacher, allClasses, form]);


  const { control, watch, setValue } = form;
  const specificSubjectAssignments = watch("specificSubjectAssignments");

  const handleSpecificAssignmentChange = (
    classId: string,
    subjectId: string,
    examId: string,
    checked: boolean
  ) => {
    // Get a deep copy of the current assignments to avoid direct state mutation issues.
    // This ensures that when we modify the examIds array, we're working with a fresh copy.
    const currentAssignments = (specificSubjectAssignments || []).map(a => ({
      ...a,
      examIds: Array.isArray(a.examIds) ? [...a.examIds] : [], // Explicitly copy the examIds array.
    }));

    let existingAssignmentEntry = currentAssignments.find(
      (a) => a.classId === classId && a.subjectId === subjectId
    );

    if (checked) {
      if (existingAssignmentEntry) {
        // Assignment for this class-subject combination already exists.
        // Add the examId to its examIds array if it's not already included.
        if (!existingAssignmentEntry.examIds.includes(examId)) {
          existingAssignmentEntry.examIds.push(examId);
        }
      } else {
        // No assignment for this class-subject combination yet.
        // Create a new entry with the current classId, subjectId, and the selected examId.
        currentAssignments.push({ classId, subjectId, examIds: [examId] });
      }
    } else {
      // The checkbox was unchecked.
      if (existingAssignmentEntry) {
        // If an assignment exists for this class-subject, filter out the unchecked examId.
        existingAssignmentEntry.examIds = existingAssignmentEntry.examIds.filter(
          (id) => id !== examId
        );
        // Note: The onSubmit logic filters out assignments where examIds becomes empty.
        // So, we don't need to remove the entire 'existingAssignmentEntry' here if examIds is empty.
      }
    }
    // Update the form state with the modified assignments.
    setValue("specificSubjectAssignments", currentAssignments, { shouldValidate: true, shouldDirty: true });
  };


  const onSubmit = (data: TeacherAssignmentFormValues) => {
    startTransition(async () => {
      try {
        // Filter out any specific assignments where no exam types ended up being selected.
        const filteredSpecificAssignments = data.specificSubjectAssignments.filter(
          assignment => assignment.examIds && assignment.examIds.length > 0
        );
        const dataToSubmit = {
            ...data,
            specificSubjectAssignments: filteredSpecificAssignments,
        };

        const result = await updateTeacherAssignments(teacher.id, dataToSubmit);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          if (onSuccess) onSuccess();
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (error) {
        toast({
          title: "Submission Error",
          description: "An unexpected error occurred while updating assignments.",
          variant: "destructive",
        });
      }
    });
  };
  

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Manage Assignments for: {teacher.name}
            </CardTitle>
            <CardDescription>
              Select classes and subjects this teacher is responsible for.
              Being a Class Teacher implicitly assigns them to all exams for all subjects in that class for the current term.
              Use "Specific Subject & Exam Assignments" for more granular control or additional assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={control}
              name="classTeacherForClassIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold text-primary">Class Teacher Role</FormLabel>
                    <FormDescription>
                      Select classes for which {teacher.name} will be the main class teacher.
                      Assigning a class here will unassign any previous class teacher.
                    </FormDescription>
                  </div>
                  <div className="space-y-2">
                    {allClasses.map((cls) => (
                      <FormField
                        key={cls.id}
                        control={control}
                        name="classTeacherForClassIds"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-accent/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(cls.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), cls.id])
                                    : field.onChange(
                                        (field.value || []).filter((id) => id !== cls.id)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal flex-1">
                              {cls.name}
                              {cls.classTeacherId && cls.classTeacherId !== teacher.id && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Currently: {allClasses.find(c => c.id === cls.classTeacherId)?.name || 'Unknown Teacher'})
                                </span>
                              )}
                               {cls.classTeacherId && cls.classTeacherId === teacher.id && (
                                <span className="text-xs text-green-600 ml-2">(Currently assigned)</span>
                              )}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="specificSubjectAssignments"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold text-primary">Specific Subject & Exam Assignments</FormLabel>
                    <FormDescription>
                      Assign {teacher.name} to teach specific subjects and exam types within classes.
                    </FormDescription>
                  </div>
                  <Accordion type="multiple" className="w-full">
                    {allClasses.map((cls) => (
                      <AccordionItem value={cls.id} key={cls.id}>
                        <AccordionTrigger className="hover:bg-accent/30 px-3 rounded-md">
                           <div className="flex items-center gap-2">
                             <Users className="h-4 w-4 text-muted-foreground"/> 
                             {cls.name} ({cls.level} {cls.stream || ''})
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-0 px-1">
                          {cls.subjects.length > 0 ? (
                            <div className="space-y-2 pl-4 border-l-2 ml-2">
                              {cls.subjects.map((subject) => {
                                const currentAssignmentForSubject = specificSubjectAssignments?.find(
                                    (a) => a.classId === cls.id && a.subjectId === subject.id
                                );
                                return (
                                    <div key={`${cls.id}-${subject.id}`} className="py-2 border-b last:border-b-0">
                                        <p className="font-medium text-sm mb-2 text-primary/80">{subject.name} {subject.code && `(${subject.code})`}</p>
                                        {isLoadingExams ? <p className="text-xs text-muted-foreground">Loading exams...</p> : allExams.length > 0 ? (
                                            <div className="space-y-1 pl-3">
                                            {allExams.map((exam) => (
                                                <FormItem key={exam.id} className="flex flex-row items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={(currentAssignmentForSubject?.examIds || []).includes(exam.id)}
                                                        onCheckedChange={(checked) => {
                                                            handleSpecificAssignmentChange(
                                                                cls.id,
                                                                subject.id,
                                                                exam.id,
                                                                Boolean(checked)
                                                            );
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="text-xs font-normal">
                                                        {exam.name}
                                                    </FormLabel>
                                                </FormItem>
                                            ))}
                                            </div>
                                        ) : <p className="text-xs text-muted-foreground italic">No exam types defined.</p>}
                                    </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic px-4 py-2">No subjects assigned to this class.</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingExams} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Assignments
          </Button>
        </div>
      </form>
    </Form>
  );
}

