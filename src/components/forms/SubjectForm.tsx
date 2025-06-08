
"use client";

import * from "react";
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
import { createSubject } from "@/lib/actions/dos-actions";
import { Loader2, Save } from "lucide-react";

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
  // If we were editing, we'd pass initialData here
  // initialData?: Partial<SubjectFormValues>;
  onSuccess?: () => void;
}

export function SubjectForm({ onSuccess }: SubjectFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const onSubmit = (data: SubjectFormValues) => {
    startTransition(async () => {
      try {
        // Ensure code is uppercase if provided, or undefined if empty
        const subjectDataToSave = {
            ...data,
            code: data.code ? data.code.toUpperCase() : undefined,
        };

        const result = await createSubject(subjectDataToSave);
        if (result.success && result.subject) {
          toast({
            title: "Subject Created",
            description: `Subject "${result.subject.name}" has been successfully added.`,
          });
          form.reset();
          if (onSuccess) onSuccess();
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create subject.",
            variant: "destructive",
          });
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
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Subject
          </Button>
        </div>
      </form>
    </Form>
  );
}
