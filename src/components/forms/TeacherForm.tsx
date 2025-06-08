
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
import { useToast } from "@/hooks/use-toast";
import { createTeacher, updateTeacher } from "@/lib/actions/dos-actions";
import { Loader2, Save, UserPlus, Edit3 } from "lucide-react";
import type { Teacher } from "@/lib/types";
import { useRouter } from "next/navigation"; // Added for redirect

const teacherFormSchema = z.object({
  name: z.string().min(2, {
    message: "Teacher name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  // subjectsAssigned could be added here if you want to edit them directly in this form
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

interface TeacherFormProps {
  initialData?: Teacher | null; // Changed to allow null
  teacherId?: string;
  onSuccess?: () => void;
}

export function TeacherForm({ initialData, teacherId, onSuccess }: TeacherFormProps) {
  const { toast } = useToast();
  const router = useRouter(); // Added for redirect
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!teacherId && !!initialData;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: TeacherFormValues) => {
    startTransition(async () => {
      try {
        let result;
        if (isEditMode) {
          const teacherDataToUpdate: Partial<Omit<Teacher, 'id' | 'subjectsAssigned'>> = {
            name: data.name,
            email: data.email,
          };
          result = await updateTeacher(teacherId!, teacherDataToUpdate);
          if (result.success && result.teacher) {
            toast({
              title: "Teacher Updated",
              description: `Teacher "${result.teacher.name}" has been successfully updated.`,
            });
            if (onSuccess) onSuccess();
            else router.push("/dos/teachers"); // Redirect after successful update
          } else {
            toast({
              title: "Error Updating Teacher",
              description: result.message || "Failed to update teacher.",
              variant: "destructive",
            });
          }
        } else {
          const teacherDataToCreate: Omit<Teacher, 'id' | 'subjectsAssigned'> & { subjectsAssigned?: Array<{ classId: string; subjectId: string }> } = {
            name: data.name,
            email: data.email,
            // subjectsAssigned is handled by createTeacher to initialize as empty array
          };
          result = await createTeacher(teacherDataToCreate as Omit<Teacher, 'id'>);
          if (result.success && result.teacher) {
            toast({
              title: "Teacher Created",
              description: `Teacher "${result.teacher.name}" has been successfully added.`,
            });
            form.reset(); // Reset form only on create
            if (onSuccess) onSuccess();
            else router.push("/dos/teachers"); // Redirect after successful creation
          } else {
            toast({
              title: "Error Creating Teacher",
              description: result.message || "Failed to create teacher.",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormDescription>
                The teacher&apos;s full name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., john.doe@example.com" {...field} />
              </FormControl>
              <FormDescription>
                The teacher&apos;s email address for communication and login.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Future: Add subject/class assignment fields here if needed for edit mode */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <Edit3 className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Teacher" : "Save Teacher"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    