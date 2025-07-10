

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
import { createTeacherWithRole, updateTeacherWithRole } from "@/lib/actions/dos-admin-actions";
import { Loader2, Save, UserPlus, Edit3 } from "lucide-react";
import type { Teacher } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Base schema for common fields
const teacherBaseSchema = z.object({
  name: z.string().min(2, {
    message: "Teacher name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  role: z.enum(['teacher', 'dos'], { required_error: "Role is required."}),
});

// Schema for creating a teacher (password required)
const createTeacherFormSchema = teacherBaseSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// Schema for updating a teacher (password optional)
const updateTeacherFormSchema = teacherBaseSchema.extend({
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Password must be at least 6 characters if provided.",
  }),
});


type TeacherFormValues = z.infer<typeof createTeacherFormSchema> | z.infer<typeof updateTeacherFormSchema>;

interface TeacherFormProps {
  initialData?: Teacher | null;
  teacherId?: string;
  onSuccess?: () => void;
}

export function TeacherForm({ initialData, teacherId, onSuccess }: TeacherFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!teacherId && !!initialData;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(isEditMode ? updateTeacherFormSchema : createTeacherFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      password: "", // Always start with empty password field in form
      role: initialData?.role || "teacher",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        password: "", // Password field is for setting/changing, not displaying
        role: initialData.role || "teacher",
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: TeacherFormValues) => {
    startTransition(async () => {
      try {
        let result;
        const teacherPayload: Partial<Teacher> & { name: string; email: string; password?: string, role: 'teacher' | 'dos' } = {
          name: data.name,
          email: data.email,
          role: data.role as 'teacher' | 'dos',
        };

        // Only include password if it's provided (and not an empty string from the form)
        if (data.password && data.password.trim() !== "") {
          teacherPayload.password = data.password;
        }
        
        if (isEditMode) {
          const updatePayload: Partial<Omit<Teacher, 'id' | 'subjectsAssigned' | 'uid' | 'password'>> = {
            name: teacherPayload.name,
            email: teacherPayload.email,
            role: teacherPayload.role,
          };
          
          if (teacherPayload.password) {
             toast({ title: "Password Update Not Supported", description: "Password updates must be done by the user themselves for security reasons.", variant: "destructive" });
             return;
          }

          result = await updateTeacherWithRole(teacherId!, updatePayload);
          if (result.success && result.teacher) {
            toast({
              title: "Teacher Updated",
              description: `Teacher "${result.teacher.name}" has been successfully updated.`,
            });
            if (onSuccess) onSuccess();
            else router.push("/dos/teachers");
          } else {
            toast({
              title: "Error Updating Teacher",
              description: result.message || "Failed to update teacher.",
              variant: "destructive",
            });
          }
        } else {
          // Create mode, password is required by schema if createTeacherFormSchema is used
          if (!teacherPayload.password) {
            toast({ title: "Password Required", description: "Password is required to create a new teacher.", variant: "destructive"});
            return;
          }
          result = await createTeacherWithRole(teacherPayload as Omit<Teacher, 'id' | 'subjectsAssigned' | 'uid'> & {password: string});
          if (result.success && result.teacher) {
            toast({
              title: "Teacher Created",
              description: `Teacher "${result.teacher.name}" has been successfully added.`,
            });
            form.reset({ name: "", email: "", password: "", role: "teacher" });
            if (onSuccess) onSuccess();
            else router.push("/dos/teachers");
          } else {
            toast({
              title: "Error Creating Teacher",
              description: result.message || "Failed to create teacher.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        const err = error as Error;
        toast({
          title: "Submission Error",
          description: err.message || "An unexpected error occurred.",
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
                <Input type="email" placeholder="e.g., john.doe@example.com" {...field} disabled={isEditMode}/>
              </FormControl>
              <FormDescription>
                {isEditMode ? "Email cannot be changed after creation." : "The teacher's email address for communication and login."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="dos">D.O.S.</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Assign the user's role.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password (min. 6 characters)" {...field} disabled={isEditMode} />
              </FormControl>
              <FormDescription>
                {isEditMode ? "Password cannot be changed from this form for security." : "Set the initial password for the teacher."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <Edit3 className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Teacher" : "Add Teacher"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
