
"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { updateTeacherAssignments } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo } from "@/lib/types";
import { Loader2, Save, Users } from "lucide-react";

const teacherAssignmentFormSchema = z.object({
  classTeacherForClassIds: z.array(z.string()),
  specificSubjectAssignments: z.array(
    z.object({
      classId: z.string(),
      subjectId: z.string(),
    })
  ),
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

  const form = useForm<TeacherAssignmentFormValues>({
    resolver: zodResolver(teacherAssignmentFormSchema),
    defaultValues: {
      classTeacherForClassIds: allClasses
        .filter((cls) => cls.classTeacherId === teacher.id)
        .map((cls) => cls.id),
      specificSubjectAssignments: teacher.subjectsAssigned || [],
    },
  });

  const onSubmit = (data: TeacherAssignmentFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateTeacherAssignments(teacher.id, data);
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
  
  const { control } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Manage Assignments for: {teacher.name}
            </CardTitle>
            <CardDescription>
              Select the classes and subjects this teacher is responsible for.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1: Class Teacher Assignments */}
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

            {/* Section 2: Specific Subject Assignments */}
            <FormField
              control={control}
              name="specificSubjectAssignments"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold text-primary">Specific Subject Assignments</FormLabel>
                    <FormDescription>
                      Assign {teacher.name} to teach specific subjects within classes.
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
                              {cls.subjects.map((subject) => (
                                <FormField
                                  key={`${cls.id}-${subject.id}`}
                                  control={control}
                                  name="specificSubjectAssignments"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 border-b last:border-b-0 rounded-md hover:bg-accent/20">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.some(
                                            (val) =>
                                              val.classId === cls.id && val.subjectId === subject.id
                                          )}
                                          onCheckedChange={(checked) => {
                                            const currentAssignments = field.value || [];
                                            if (checked) {
                                              field.onChange([
                                                ...currentAssignments,
                                                { classId: cls.id, subjectId: subject.id },
                                              ]);
                                            } else {
                                              field.onChange(
                                                currentAssignments.filter(
                                                  (val) =>
                                                    !(val.classId === cls.id && val.subjectId === subject.id)
                                                )
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {subject.name} {subject.code && `(${subject.code})`}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
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
          <Button type="submit" disabled={isPending} size="lg">
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
