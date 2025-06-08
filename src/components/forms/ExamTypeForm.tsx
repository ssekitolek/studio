
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createExam, getTerms } from "@/lib/actions/dos-actions";
import type { Term, Exam } from "@/lib/types";
import { Loader2, Save, PlusCircle, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";

const examTypeFormSchema = z.object({
  name: z.string().min(3, "Exam name must be at least 3 characters."),
  termId: z.string().min(1, "Please select an academic term."),
  maxMarks: z.coerce.number().min(1, "Maximum marks must be at least 1.").max(1000, "Maximum marks seem too high."),
  description: z.string().optional(),
});

type ExamTypeFormValues = z.infer<typeof examTypeFormSchema>;

interface ExamTypeFormProps {
  initialData?: Exam | null;
  examId?: string;
  onSuccess?: () => void;
}

export function ExamTypeForm({ initialData, examId, onSuccess }: ExamTypeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [terms, setTerms] = React.useState<Term[]>([]);
  const [isLoadingTerms, setIsLoadingTerms] = React.useState(true);

  const isEditMode = !!examId && !!initialData;

  const form = useForm<ExamTypeFormValues>({
    resolver: zodResolver(examTypeFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      termId: initialData?.termId || "",
      maxMarks: initialData?.maxMarks || 100,
      description: initialData?.description || "",
    },
  });

  React.useEffect(() => {
    async function fetchTermsData() {
      setIsLoadingTerms(true);
      try {
        const termsData = await getTerms();
        setTerms(termsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load academic terms.", variant: "destructive" });
      } finally {
        setIsLoadingTerms(false);
      }
    }
    fetchTermsData();
  }, [toast]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        termId: initialData.termId,
        maxMarks: initialData.maxMarks,
        description: initialData.description || "",
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: ExamTypeFormValues) => {
    startTransition(async () => {
      const examDataToSave = {
        ...data,
        // `date` is not part of this form for "Exam Type" definition
      };

      try {
        if (isEditMode && examId) {
          // const result = await updateExam(examId, examDataToSave); // updateExam action would be needed for edit mode
          // For now, log and show placeholder toast for edit
          console.log("Updating exam (placeholder):", examId, examDataToSave);
          toast({ title: "Exam Type Updated (Placeholder)", description: `Exam Type "${data.name}" update functionality pending.` });
          if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");

        } else {
          const result = await createExam(examDataToSave as Omit<Exam, 'id' | 'date'>);
          if (result.success && result.exam) {
            toast({
              title: "Exam Type Created",
              description: `Exam Type "${result.exam.name}" has been successfully created.`,
            });
            form.reset({ name: "", termId: "", maxMarks: 100, description: "" });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");
          } else {
            toast({
              title: "Error Creating Exam Type",
              description: result.message || "Failed to create exam type.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ title: "Submission Error", description: errorMessage, variant: "destructive" });
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
                <FormLabel>Exam Type Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Midterm Exam, Final Assessment" {...field} />
                </FormControl>
                <FormDescription>The name of this examination type.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="termId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic Term</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTerms}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingTerms ? "Loading terms..." : "Select a term"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!isLoadingTerms && terms.map(term => (
                      <SelectItem key={term.id} value={term.id}>{term.name} ({term.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Associate this exam type with an academic term.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxMarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Marks</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 100" {...field} />
                </FormControl>
                <FormDescription>The default maximum score for this exam type.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a brief description or any specific instructions for this exam type."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingTerms} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
               <Edit3 className="mr-2 h-4 w-4" />
            ): (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Exam Type" : "Create Exam Type"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
