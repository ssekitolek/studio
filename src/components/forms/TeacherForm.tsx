
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
import { createTeacher } from "@/lib/actions/dos-actions";
import { Loader2, Save, UserPlus } from "lucide-react";
import type { Teacher } from "@/lib/types";

const teacherFormSchema = z.object({
  name: z.string().min(2, {
    message: "Teacher name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

interface TeacherFormProps {
  onSuccess?: () => void;
}

export function TeacherForm({ onSuccess }: TeacherFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = (data: TeacherFormValues) => {
    startTransition(async () => {
      try {
        // The subjectsAssigned field will be initialized as an empty array in the server action.
        const teacherDataToSave: Omit<Teacher, 'id' | 'subjectsAssigned'> & { subjectsAssigned?: Array<{ classId: string; subjectId: string }> } = {
          name: data.name,
          email: data.email,
          // subjectsAssigned is intentionally omitted here, will be handled by createTeacher action
        };

        const result = await createTeacher(teacherDataToSave as Omit<Teacher, 'id'>); // Cast as server action expects Omit<Teacher, 'id'>

        if (result.success && result.teacher) {
          toast({
            title: "Teacher Created",
            description: `Teacher "${result.teacher.name}" has been successfully added.`,
          });
          form.reset();
          if (onSuccess) onSuccess();
          // Consider redirecting or updating UI state here
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create teacher.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Submission Error",
          description: "An unexpected error occurred while creating the teacher.",
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
        {/* Future: Add subject/class assignment fields here */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Teacher
          </Button>
        </div>
      </form>
    </Form>
  );
}
