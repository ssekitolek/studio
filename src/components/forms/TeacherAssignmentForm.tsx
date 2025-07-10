
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { updateTeacherAssignments, getSubjects, getTeachers } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo, Subject as SubjectType } from "@/lib/types";
import { Loader2, Save, Users, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const subjectAssignmentSchema = z.object({
  subjectId: z.string(),
  classIds: z.array(z.string()),
});

const teacherAssignmentFormSchema = z.object({
  classTeacherForClassIds: z.array(z.string()).optional(),
  subjectsAssigned: z.array(subjectAssignmentSchema),
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
  const [allSubjects, setAllSubjects] = React.useState<SubjectType[]>([]);
  const [allTeachers, setAllTeachers] = React.useState<Teacher[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const form = useForm<TeacherAssignmentFormValues>({
    resolver: zodResolver(teacherAssignmentFormSchema),
    defaultValues: {
      classTeacherForClassIds: [],
      subjectsAssigned: [],
    },
  });

  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [subjectsData, teachersData] = await Promise.all([getSubjects(), getTeachers()]);
        setAllSubjects(subjectsData);
        setAllTeachers(teachersData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load subjects.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [toast]);

  React.useEffect(() => {
    if (!isLoadingData) {
      form.reset({
        classTeacherForClassIds: allClasses
          .filter((cls) => cls.classTeacherId === teacher.id)
          .map((cls) => cls.id),
        subjectsAssigned: teacher.subjectsAssigned || [],
      });
    }
  }, [teacher, allClasses, form, isLoadingData]);

  const { control, setValue, getValues } = form;

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "subjectsAssigned",
  });

  const assignedSubjectIds = new Set(fields.map(field => field.subjectId));

  const onSubmit = (data: TeacherAssignmentFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateTeacherAssignments(teacher.id, {
            classTeacherForClassIds: data.classTeacherForClassIds || [],
            specificSubjectAssignments: data.subjectsAssigned
        });
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
  };

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
                    <FormLabel className="text-lg font-semibold flex items-center gap-2"><Users/> Class Teacher Role (Optional)</FormLabel>
                    <FormDescription>
                      Assign {teacher.name} as the main Class Teacher. This grants oversight and will unassign any previous teacher from this role for the selected class.
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
                                    : field.onChange((field.value || []).filter((id) => id !== cls.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal flex-1">
                              {cls.name}
                              {cls.classTeacherId && cls.classTeacherId !== teacher.id && (
                                <span className="text-xs text-muted-foreground ml-2">(Currently: {getTeacherName(cls.classTeacherId)})</span>
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
                <FormLabel className="text-lg font-semibold flex items-center gap-2"><BookOpen /> Subject Teaching Assignments</FormLabel>
                <FormDescription>
                  Assign subjects to {teacher.name} and specify which classes they teach for each subject.
                </FormDescription>
              </div>
              <div className="space-y-4">
                 {fields.map((field, index) => {
                     const subject = allSubjects.find(s => s.id === field.subjectId);
                     return (
                        <Card key={field.id} className="p-4">
                           <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{subject?.name || 'Unknown Subject'}</h4>
                                    <p className="text-xs text-muted-foreground">{subject?.code}</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Remove</Button>
                           </div>
                           <FormField
                                control={control}
                                name={`subjectsAssigned.${index}.classIds`}
                                render={({ field: classField }) => (
                                    <FormItem className="mt-2">
                                        <FormLabel>Classes Taught</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                    "w-full justify-between",
                                                    !classField.value?.length && "text-muted-foreground"
                                                    )}
                                                >
                                                    {classField.value?.length > 0 ? `${classField.value.length} class(es) selected` : "Select classes"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                <CommandInput placeholder="Search classes..." />
                                                <CommandList>
                                                    <CommandEmpty>No classes found.</CommandEmpty>
                                                    <CommandGroup>
                                                    {allClasses.map((cls) => (
                                                        <CommandItem
                                                            value={cls.name}
                                                            key={cls.id}
                                                            onSelect={() => {
                                                                const currentValue = classField.value || [];
                                                                const isSelected = currentValue.includes(cls.id);
                                                                const newValue = isSelected
                                                                    ? currentValue.filter(id => id !== cls.id)
                                                                    : [...currentValue, cls.id];
                                                                classField.onChange(newValue);
                                                            }}
                                                            >
                                                            <Check
                                                                className={cn(
                                                                "mr-2 h-4 w-4",
                                                                (classField.value || []).includes(cls.id) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {cls.name}
                                                        </CommandItem>
                                                    ))}
                                                    </CommandGroup>
                                                </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>
                     )
                 })}
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" disabled={isLoadingData || allSubjects.length === assignedSubjectIds.size}>Add Subject Assignment</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                         <Command>
                            <CommandInput placeholder="Search subjects..." />
                            <CommandList>
                                <CommandEmpty>No subjects found.</CommandEmpty>
                                <CommandGroup>
                                    {allSubjects.filter(s => !assignedSubjectIds.has(s.id)).map((subject) => (
                                        <CommandItem
                                            key={subject.id}
                                            value={subject.name}
                                            onSelect={() => {
                                                append({ subjectId: subject.id, classIds: [] });
                                            }}
                                        >
                                            {subject.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                         </Command>
                    </PopoverContent>
                 </Popover>
              </div>
              <FormMessage />
            </FormItem>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingData} size="lg">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Assignments
          </Button>
        </div>
      </form>
    </Form>
  );
}
