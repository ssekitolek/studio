"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker"; // Assuming a DatePicker component exists
import { Settings2, Save, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { getGeneralSettings, updateGeneralSettings, getTerms } from "@/lib/actions/dos-actions";
import type { GeneralSettings, Term } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Create a simple DatePicker if not already available
const SimpleDatePicker = ({ value, onChange }: { value?: string, onChange: (date?: string) => void }) => {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  return (
    <Input 
      type="date" 
      value={value ? value.split('T')[0] : ""} // Format for HTML date input
      onChange={(e) => {
        const newDate = e.target.value ? new Date(e.target.value) : undefined;
        setDate(newDate);
        onChange(newDate?.toISOString());
      }}
    />
  );
};


const gradingScaleItemSchema = z.object({
  grade: z.string().min(1, "Grade cannot be empty."),
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
}).refine(data => data.minScore <= data.maxScore, {
  message: "Min score cannot exceed max score.",
  path: ["minScore"],
});

const generalSettingsSchema = z.object({
  currentTermId: z.string().optional(),
  defaultGradingScale: z.array(gradingScaleItemSchema),
  markSubmissionTimeZone: z.string().min(1, "Timezone is required."),
  // Example: Adding a global deadline field
  globalMarksSubmissionDeadline: z.string().optional(), 
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [terms, setTerms] = useState<Term[]>([]);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      currentTermId: "",
      defaultGradingScale: [{ grade: "A", minScore: 80, maxScore: 100 }],
      markSubmissionTimeZone: "UTC",
      globalMarksSubmissionDeadline: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "defaultGradingScale"
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [settings, termsData] = await Promise.all([getGeneralSettings(), getTerms()]);
        form.reset({
          currentTermId: settings.currentTermId || "",
          defaultGradingScale: settings.defaultGradingScale.length > 0 ? settings.defaultGradingScale : [{ grade: "A", minScore: 80, maxScore: 100 }],
          markSubmissionTimeZone: settings.markSubmissionTimeZone || "UTC",
          // globalMarksSubmissionDeadline: settings.globalMarksSubmissionDeadline // Assuming this field exists
        });
        setTerms(termsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load settings.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [form, toast]);

  const onSubmit = (data: GeneralSettingsFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateGeneralSettings(data as GeneralSettings); // Cast might be needed if types slightly differ
        if (result.success) {
          toast({ title: "Settings Saved", description: result.message });
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Save Failed", description: "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Settings"
        description="Manage global configurations for GradeCentral."
        icon={Settings2}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Academic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="currentTermId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Academic Term</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select current term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terms.map(term => (
                          <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Set the active term for the system.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="globalMarksSubmissionDeadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Global Marks Submission Deadline (Optional)</FormLabel>
                    <SimpleDatePicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormDescription>A general deadline if not set per exam. Specific exam deadlines override this.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Grading Scale</CardTitle>
              <CardDescription>Define the default grading scale used across the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`defaultGradingScale.${index}.grade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade</FormLabel>
                        <FormControl><Input placeholder="e.g., A+" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`defaultGradingScale.${index}.minScore`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Score (%)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 90" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`defaultGradingScale.${index}.maxScore`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Score (%)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ grade: "", minScore: 0, maxScore: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Grade Tier
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="markSubmissionTimeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Timezone</FormLabel>
                    {/* In a real app, this would be a comprehensive list or a smarter picker */}
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Timezone for deadlines and timestamps.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="lg">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Basic DatePicker if ShadCN's is not readily available or too complex for this scope
// If you have components/ui/date-picker.tsx, this can be removed.
// This is a placeholder for a proper date picker component.
// For now, using SimpleDatePicker above.
/*
"use client";
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePicker({ date, setDate, placeholder = "Pick a date" }: { date?: Date, setDate: (date?: Date) => void, placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
*/

