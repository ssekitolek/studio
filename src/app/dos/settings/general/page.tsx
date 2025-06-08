
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
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Save, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { getGeneralSettings, updateGeneralSettings, getTerms } from "@/lib/actions/dos-actions";
import type { GeneralSettings, Term } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Create a simple DatePicker if not already available
const SimpleDatePicker = ({ value, onChange }: { value?: string, onChange: (date?: string) => void }) => {
  return (
    <Input 
      type="date" 
      value={value ? value.split('T')[0] : ""} // Format for HTML date input
      onChange={(e) => {
        const newDateValue = e.target.value;
        onChange(newDateValue ? new Date(newDateValue).toISOString() : undefined);
      }}
    />
  );
};


const gradingScaleItemSchema = z.object({
  grade: z.string().min(1, "Grade cannot be empty."),
  minScore: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().min(0).max(100),
}).refine(data => data.minScore <= data.maxScore, {
  message: "Min score cannot exceed max score.",
  path: ["minScore"],
});

const generalSettingsSchema = z.object({
  currentTermId: z.string().optional(),
  defaultGradingScale: z.array(gradingScaleItemSchema),
  markSubmissionTimeZone: z.string().min(1, "Timezone is required."),
  globalMarksSubmissionDeadline: z.string().optional(), 
  dosGlobalAnnouncementText: z.string().optional(),
  dosGlobalAnnouncementType: z.enum(["info", "warning", ""]).optional(),
  teacherDashboardResourcesText: z.string().optional(), // New schema field
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
      dosGlobalAnnouncementText: "",
      dosGlobalAnnouncementType: "",
      teacherDashboardResourcesText: "", // Default for new field
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
          defaultGradingScale: settings.defaultGradingScale && settings.defaultGradingScale.length > 0 ? settings.defaultGradingScale : [{ grade: "A", minScore: 80, maxScore: 100 }],
          markSubmissionTimeZone: settings.markSubmissionTimeZone || "UTC",
          globalMarksSubmissionDeadline: settings.globalMarksSubmissionDeadline || undefined,
          dosGlobalAnnouncementText: settings.dosGlobalAnnouncementText || "",
          dosGlobalAnnouncementType: settings.dosGlobalAnnouncementType || "",
          teacherDashboardResourcesText: settings.teacherDashboardResourcesText || "", // Load new field
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
        const settingsToSave: GeneralSettings = {
          ...data,
          dosGlobalAnnouncementType: data.dosGlobalAnnouncementType === "" ? undefined : data.dosGlobalAnnouncementType,
          teacherDashboardResourcesText: data.teacherDashboardResourcesText || undefined, // Save new field
        };
        const result = await updateGeneralSettings(settingsToSave); 
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
                    <Select onValueChange={field.onChange} value={field.value || ""} >
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
              <CardTitle className="font-headline text-xl text-primary">D.O.S. Announcements</CardTitle>
              <CardDescription>Set a global announcement for teachers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="dosGlobalAnnouncementText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Announcement Text (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter announcement here..."
                        className="resize-y min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This message will be shown on the teacher dashboard.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dosGlobalAnnouncementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Announcement Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select announcement type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Visual style for the announcement.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherDashboardResourcesText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher Dashboard Resources Text (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter text for the teacher resources section..."
                        className="resize-y min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This text will be shown in the 'Teacher Resources' card on the teacher dashboard.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Default Grading Scale</CardTitle>
              <CardDescription>Define the default grading scale used across the system unless a specific policy overrides it.</CardDescription>
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
                    disabled={fields.length <=1}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
