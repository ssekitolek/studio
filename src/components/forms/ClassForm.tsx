
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createClass, getTeachers, getSubjects, updateClass } from "@/lib/actions/dos-actions";
import type { Teacher, Subject, ClassInfo } from "@/lib/types";
import { Loader2, Save, PlusCircle, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "../ui/textarea";

const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required."),
  level: z.string().min(1, "Level is required (e.g., Form 1, Grade 10)."),
  streams: z.string().optional(),
  classTeacherId: z.string().optional(),
  subjectIds: z.array(z.string()).min(1, "At least one subject must be selected."),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  initialData?: ClassInfo | null; 
  classId?: string; 
  onSuccess?: () => void;
}

const NONE_TEACHER_VALUE = "_NONE_"; 

export function ClassForm({ initialData, classId, onSuccess }: ClassFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const isEditMode = !!classId && !!initialData;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      level: initialData?.level || "",
      streams: initialData?.streams?.join(", ") || "",
      classTeacherId: initialData?.classTeacherId || "", 
      subjectIds: initialData?.subjects.map(s => s.id) || [],
    },
  });

  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [teachersData, subjectsData] = await Promise.all([
          getTeachers(),
          getSubjects(),
        ]);
        setTeachers(teachersData);
        setSubjects(subjectsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load teachers or subjects.", variant: "destructive" });
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
        level: initialData.level,
        streams: initialData.streams?.join(", ") || "",
        classTeacherId: initialData.classTeacherId || "", 
        subjectIds: initialData.subjects.map(s => s.id),
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: ClassFormValues) => {
    startTransition(async () => {
      const classPayload = {
        ...data,
        classTeacherId: data.classTeacherId === NONE_TEACHER_VALUE ? undefined : data.classTeacherId,
        streams: data.streams ? data.streams.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      try {
        if (isEditMode && classId) {
          const result = await updateClass(classId, classPayload as any);
          if (result.success) {
            toast({ title: "Class Updated", description: `Class "${data.name}" updated successfully.` });
            if (onSuccess) onSuccess(); else router.push("/dos/classes");
          } else {
            toast({ title: "Error", description: result.message || "Failed to update class.", variant: "destructive" });
          }
        } else {
          const result = await createClass(classPayload as any);
          if (result.success && result.classInfo) {
            toast({
              title: "Class Created",
              description: `Class "${result.classInfo.name}" has been successfully created.`,
            });
            form.reset({ name: "", level: "", streams: "", classTeacherId: "", subjectIds: [] });
            if (onSuccess) {
              onSuccess();
            } else {
              router.push("/dos/classes");
            }
          } else {
            toast({
              title: "Error",
              description: result.message || "Failed to create class.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        toast({
          title: "Submission Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Form 1, Year 10" {...field} />
                </FormControl>
                <FormDescription>The general name of the class (e.g., Form 1). Streams are handled separately.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1, 10, 7" {...field} />
                </FormControl>
                <FormDescription>The academic level of the class.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="streams"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Streams (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., A, B, C, North, South" {...field} className="min-h-[60px]" />
                </FormControl>
                <FormDescription>If this class level has multiple streams, enter them separated by commas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="classTeacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Teacher (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || NONE_TEACHER_VALUE} disabled={isLoadingData}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingData ? "Loading teachers..." : "Select a teacher or None"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_TEACHER_VALUE}>None</SelectItem>
                    {!isLoadingData && teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Assign a main teacher to this class.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subjectIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Subjects Taught</FormLabel>
                <FormDescription>
                  Select all subjects that will be taught in this class.
                </FormDescription>
              </div>
              {isLoadingData ? <p>Loading subjects...</p> : subjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subjects.map((subject) => (
                    <FormField
                      key={subject.id}
                      control={form.control}
                      name="subjectIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={subject.id}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(subject.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), subject.id])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== subject.id
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {subject.name} {subject.code && `(${subject.code})`}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              ) : <p>No subjects available. Please add subjects first.</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingData} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
               <Edit3 className="mr-2 h-4 w-4" />
            ): (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Class" : "Create Class"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
