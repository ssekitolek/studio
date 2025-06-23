"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Save, Loader2, Scale } from "lucide-react";
import { getGeneralSettings, updateGeneralSettings, getTerms } from "@/lib/actions/dos-actions";
import type { GeneralSettings, Term, GradingScaleItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";

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


// Schema no longer includes defaultGradingScale as it is not managed here
const generalSettingsSchema = z.object({
  currentTermId: z.string().optional(),
  markSubmissionTimeZone: z.string().min(1, "Timezone is required."),
  globalMarksSubmissionDeadline: z.string().optional(), 
  dosGlobalAnnouncementText: z.string().optional(),
  dosGlobalAnnouncementType: z.enum(["info", "warning", ""]).optional(),
  dosGlobalAnnouncementImageUrl: z.string().url().optional(),
  teacherDashboardResourcesText: z.string().optional(),
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [terms, setTerms] = useState<Term[]>([]);
  const [defaultGradingScale, setDefaultGradingScale] = useState<GradingScaleItem[]>([]);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      currentTermId: "",
      markSubmissionTimeZone: "UTC",
      globalMarksSubmissionDeadline: undefined,
      dosGlobalAnnouncementText: "",
      dosGlobalAnnouncementType: "",
      dosGlobalAnnouncementImageUrl: "",
      teacherDashboardResourcesText: "",
    },
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [settings, termsData] = await Promise.all([getGeneralSettings(), getTerms()]);
        form.reset({
          currentTermId: settings.currentTermId || "",
          markSubmissionTimeZone: settings.markSubmissionTimeZone || "UTC",
          globalMarksSubmissionDeadline: settings.globalMarksSubmissionDeadline || undefined,
          dosGlobalAnnouncementText: settings.dosGlobalAnnouncementText || "",
          dosGlobalAnnouncementType: settings.dosGlobalAnnouncementType || "",
          dosGlobalAnnouncementImageUrl: settings.dosGlobalAnnouncementImageUrl || "",
          teacherDashboardResourcesText: settings.teacherDashboardResourcesText || "",
        });
        setDefaultGradingScale(settings.defaultGradingScale || []);
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
        const settingsToSave: Partial<GeneralSettings> = {
          ...data,
          dosGlobalAnnouncementType: data.dosGlobalAnnouncementType === "" ? undefined : data.dosGlobalAnnouncementType,
          teacherDashboardResourcesText: data.teacherDashboardResourcesText || undefined,
          dosGlobalAnnouncementImageUrl: data.dosGlobalAnnouncementImageUrl || undefined,
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
        description="Manage global configurations for the system."
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
               <ImageUploadInput
                fieldName="dosGlobalAnnouncementImageUrl"
                label="Announcement Image (Optional)"
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
              <CardDescription>
                This is the current default grading scale used across the system. It is managed via Grading Policies on the "Exams &amp; Grading" page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {defaultGradingScale.length > 0 ? (
                <div className="space-y-2 rounded-md border p-4 bg-muted/50">
                  {defaultGradingScale.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                      <div><span className="font-semibold text-muted-foreground">Grade:</span> {item.grade}</div>
                      <div><span className="font-semibold text-muted-foreground">Min Score:</span> {item.minScore}%</div>
                      <div><span className="font-semibold text-muted-foreground">Max Score:</span> {item.maxScore}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No default grading scale is set. Please set a default policy on the Exams &amp; Grading page.</p>
              )}
              <Button variant="outline" asChild>
                <Link href="/dos/settings/exams">
                  <Scale className="mr-2 h-4 w-4" /> Manage Grading Policies
                </Link>
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
