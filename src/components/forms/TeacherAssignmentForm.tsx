
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
import { updateTeacherAssignments, getExams, getTeachers } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo, Exam as ExamType } from "@/lib/types";
import { Loader2, Save, Users, BookOpen } from "lucide-react";

const specificSubjectAssignmentSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  examIds: z.array(z.string()),
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
  const [allTeachers, setAllTeachers] = React.useState<Teacher[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const form = useForm<TeacherAssignmentFormValues>({
    resolver: zodResolver(teacherAssignmentFormSchema),
    defaultValues: {
      classTeacherForClassIds: [],
      specificSubjectAssignments: [],
    },
  });
  
  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [examsData, teachersData] = await Promise.all([getExams(), getTeachers()]);
        setAllExams(examsData);
        setAllTeachers(teachersData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load supporting data (exams, teachers).", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
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
    const currentAssignments = (specificSubjectAssignments || []).map(a => ({
      ...a,
      examIds: Array.isArray(a.examIds) ? [...a.examIds] : [],
    }));

    let existingAssignmentEntry = currentAssignments.find(
      (a) => a.classId === classId && a.subjectId === subjectId
    );

    if (checked) {
      if (existingAssignmentEntry) {
        if (!existingAssignmentEntry.examIds.includes(examId)) {
          existingAssignmentEntry.examIds.push(examId);
        }
      } else {
        currentAssignments.push({ classId, subjectId, examIds: [examId] });
      }
    } else {
      if (existingAssignmentEntry) {
        existingAssignmentEntry.examIds = existingAssignmentEntry.examIds.filter(
          (id) => id !== examId
        );
      }
    }
    setValue("specificSubjectAssignments", currentAssignments, { shouldValidate: true, shouldDirty: true });
  };


  const onSubmit = (data: TeacherAssignmentFormValues) => {
    startTransition(async () => {
      try {
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
  
  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Unknown Teacher';
    return allTeachers.find(t => t.id === teacherId)?.name || 'Unknown Teacher';
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Assignments for: {teacher.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={control}
              name="classTeacherForClassIds"
              render={() => (
                <FormItem className="p-4 border rounded-lg bg-secondary/30">
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold flex items-center gap-2"><Users/> Class Teacher Role</FormLabel>
                    <FormDescription>
                      Assign {teacher.name} as the main Class Teacher. This role grants oversight over the class. It unassigns any previous teacher from this role for the selected class.
                    </FormDescription>
                  </div>
                  <div className="space-y-2">
                    {allClasses.map((cls) => (
                      <FormField
                        key={cls.id}
                        control={control}
                        name="classTeacherForClassIds"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md bg-background hover:bg-accent/50">
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
                                  (Currently: {getTeacherName(cls.classTeacherId)})
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

            <FormItem className="p-4 border rounded-lg bg-secondary/30">
                <div className="mb-4">
                <FormLabel className="text-lg font-semibold flex items-center gap-2"><BookOpen /> Specific Subject & Exam Assignments</FormLabel>
                <FormDescription>
                    Assign {teacher.name} to teach specific subjects and be responsible for their exams within classes. This is for assignments not covered by the Class Teacher role.
                </FormDescription>
                </div>
                <Accordion type="multiple" className="w-full">
                {allClasses.map((cls) => (
                    <AccordionItem value={cls.id} key={cls.id} className="bg-background border rounded-md mb-2 px-3">
                    <AccordionTrigger>
                        {cls.name}
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0">
                        {cls.subjects.length > 0 ? (
                        <div className="space-y-2">
                            {cls.subjects.map((subject) => {
                            const currentAssignmentForSubject = specificSubjectAssignments?.find(
                                (a) => a.classId === cls.id && a.subjectId === subject.id
                            );
                            return (
                                <div key={`${cls.id}-${subject.id}`} className="py-2 border-t last:border-b-0">
                                    <p className="font-medium text-sm mb-2 text-primary/80">{subject.name} {subject.code && `(${subject.code})`}</p>
                                    {isLoadingData ? <p className="text-xs text-muted-foreground">Loading exams...</p> : allExams.length > 0 ? (
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
                        <p className="text-sm text-muted-foreground italic px-4 py-2">No subjects assigned to this class. Edit the class to add subjects.</p>
                        )}
                    </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
                <FormMessage />
            </FormItem>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingData} size="lg">
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
