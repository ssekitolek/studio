
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
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { createTerm, updateTerm } from "@/lib/actions/dos-actions";
import type { Term } from "@/lib/types";
import { Loader2, Save, CalendarPlus, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const termFormSchema = z.object({
  name: z.string().min(3, "Term name must be at least 3 characters."),
  year: z.number().min(new Date().getFullYear() - 10, "Year seems too far in the past.").max(new Date().getFullYear() + 10, "Year seems too far in the future."),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type TermFormValues = z.infer<typeof termFormSchema>;

interface TermFormProps {
  initialData?: Term | null;
  termId?: string;
  onSuccess?: () => void;
}

export function TermForm({ initialData, termId, onSuccess }: TermFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!termId && !!initialData;

  const currentYear = new Date().getFullYear();

  const form = useForm<TermFormValues>({
    resolver: zodResolver(termFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      year: initialData?.year || currentYear,
      startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
      endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        year: initialData.year,
        startDate: new Date(initialData.startDate), // Dates are strings from DB, convert to Date
        endDate: new Date(initialData.endDate),   // Dates are strings from DB, convert to Date
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: TermFormValues) => {
    startTransition(async () => {
      const termDataToSave = {
        ...data,
        // Dates are already Date objects from form, format them to string for DB
        startDate: format(data.startDate, "yyyy-MM-dd"), 
        endDate: format(data.endDate, "yyyy-MM-dd"),
      };

      try {
        if (isEditMode && termId) {
          const result = await updateTerm(termId, termDataToSave as Partial<Omit<Term, 'id'>>);
          if (result.success) {
            toast({ title: "Term Updated", description: `Term "${data.name}" updated successfully.` });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/terms");
          } else {
            toast({ title: "Error Updating Term", description: result.message || "Failed to update term.", variant: "destructive" });
          }
        } else {
          const result = await createTerm(termDataToSave as Omit<Term, 'id'>);
          if (result.success && result.term) {
            toast({
              title: "Term Created",
              description: `Term "${result.term.name}" has been successfully created.`,
            });
            form.reset({ name: "", year: new Date().getFullYear(), startDate: undefined, endDate: undefined });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/terms");
          } else {
            toast({
              title: "Error Creating Term",
              description: result.message || "Failed to create term.",
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
                <FormLabel>Term Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Term 1 2024, Semester 1" {...field} />
                </FormControl>
                <FormDescription>The official name of the academic term.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Academic Year</FormLabel>
                <FormControl>
                  <Input type="number" placeholder={`e.g., ${currentYear}`} {...field} 
                   onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription>The year this term belongs to.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <DatePicker
                  date={field.value}
                  setDate={field.onChange}
                  placeholder="Select term start date"
                />
                <FormDescription>When the term officially begins.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <DatePicker
                  date={field.value}
                  setDate={field.onChange}
                  placeholder="Select term end date"
                  disabled={(date) => form.getValues("startDate") ? date < form.getValues("startDate") : false}
                />
                <FormDescription>When the term officially ends.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <Edit3 className="mr-2 h-4 w-4" />
            ) : (
              <CalendarPlus className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Term" : "Create Term"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
