
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
import { createSubject, updateSubject } from "@/lib/actions/dos-actions";
import type { Subject } from "@/lib/types";
import { Loader2, Save, PlusCircle, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";

const subjectFormSchema = z.object({
  name: z.string().min(2, {
    message: "Subject name must be at least 2 characters.",
  }),
  code: z.string().optional().refine(value => !value || /^[A-Z]{3,4}$/.test(value), {
    message: "Code must be 3-4 uppercase letters (e.g., MATH, ENG). Leave blank if not applicable.",
  }),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  initialData?: Subject | null;
  subjectId?: string;
  onSuccess?: () => void;
}

export function SubjectForm({ initialData, subjectId, onSuccess }: SubjectFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!subjectId && !!initialData;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        code: initialData.code || "",
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: SubjectFormValues) => {
    startTransition(async () => {
      try {
        const subjectDataToSave = {
          ...data,
          code: data.code ? data.code.toUpperCase() : undefined,
        };

        if (isEditMode && subjectId) {
          const result = await updateSubject(subjectId, subjectDataToSave as Partial<Omit<Subject, 'id'>>);
          if (result.success && result.subject) {
            toast({
              title: "Subject Updated",
              description: `Subject "${result.subject.name}" has been successfully updated.`,
            });
            if (onSuccess) onSuccess(); else router.push("/dos/classes");
          } else {
            toast({
              title: "Error Updating Subject",
              description: result.message || "Failed to update subject.",
              variant: "destructive",
            });
          }
        } else {
          const result = await createSubject(subjectDataToSave as Omit<Subject, 'id'>);
          if (result.success && result.subject) {
            toast({
              title: "Subject Created",
              description: `Subject "${result.subject.name}" has been successfully added.`,
            });
            form.reset({ name: "", code: "" });
            if (onSuccess) onSuccess(); else router.push("/dos/classes");
          } else {
            toast({
              title: "Error Creating Subject",
              description: result.message || "Failed to create subject.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
          title: "Submission Error",
          description: errorMessage,
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
              <FormLabel>Subject Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Mathematics, History" {...field} />
              </FormControl>
              <FormDescription>
                The full name of the subject.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MATH, ENG, HIST" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
              </FormControl>
              <FormDescription>
                A short, unique code for the subject (3-4 uppercase letters).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <Edit3 className="mr-2 h-4 w-4" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Subject" : "Create Subject"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
