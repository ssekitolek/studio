
"use client";

import * as React from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateWebsiteSection } from "@/lib/actions/website-actions";
import type { WebsiteContent, SimplePageContent, MissionVisionPageContent } from "@/lib/types";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";


// Schemas for individual form sections
const logoUrlSchema = z.object({ logoUrl: z.string().url("Must be a valid URL.").or(z.literal('')) });
const contactPageSchema = z.object({
      title: z.string().min(1, "Title is required."),
      address: z.string().min(1, "Address is required."),
      phone: z.string().min(1, "Phone number is required."),
      email: z.string().email("Must be a valid email."),
      mapImageUrl: z.string().url("Must be a valid URL for the map image.").or(z.literal('')),
});
const simplePageContentSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    heroImageUrl: z.string().url("Must be a valid URL for the hero image.").or(z.literal('')),
    contentTitle: z.string().min(1, "Content title is required."),
    contentBody: z.string().min(1, "Content body is required."),
});

const missionVisionPageContentSchema = z.object({
    heroTitle: z.string().min(1),
    heroDescription: z.string().min(1),
    heroImageUrl: z.string().url().or(z.literal('')),
    missionTitle: z.string().min(1),
    missionText: z.string().min(1),
    missionImageUrl: z.string().url().or(z.literal('')),
    visionTitle: z.string().min(1),
    visionText: z.string().min(1),
    visionImageUrl: z.string().url().or(z.literal('')),
    coreValuesTitle: z.string().min(1),
    coreValuesDescription: z.string().min(1),
    coreValues: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
    })),
});

// Generic Form Component for each section
function SectionForm<T extends z.ZodType<any, any>>({ sectionKey, initialData, formSchema, children }: { sectionKey: keyof WebsiteContent | 'logoUrl', initialData: any, formSchema: T, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<T>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData,
    });

    const onSubmit = (data: z.infer<T>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection(sectionKey, data);
            if (result.success) {
                toast({ title: "Success", description: result.message });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };
    
    // Provide the form context to child components
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {children}
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}


// Main component orchestrating all the forms
export function WebsiteContentForm({ initialData }: { initialData: WebsiteContent }) {
  return (
    <Accordion type="multiple" defaultValue={["item-general"]} className="w-full space-y-4">
      
      <AccordionItem value="item-general" className="border rounded-lg bg-card">
        <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General</CardTitle></AccordionTrigger>
        <AccordionContent className="p-4 pt-0">
          <SectionForm sectionKey="logoUrl" initialData={{logoUrl: initialData.logoUrl}} formSchema={logoUrlSchema}>
            <ImageUploadInput fieldName="logoUrl" label="School Logo URL" />
          </SectionForm>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-contact" className="border rounded-lg bg-card">
        <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Contact Page</CardTitle></AccordionTrigger>
        <AccordionContent className="p-4 pt-0 space-y-4">
           <SectionForm sectionKey="contactPage" initialData={initialData.contactPage} formSchema={contactPageSchema}>
                <FormField control={useFormContext().control} name="title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={useFormContext().control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={useFormContext().control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={useFormContext().control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="mapImageUrl" label="Map Image URL" />
           </SectionForm>
        </AccordionContent>
      </AccordionItem>

      {[
        {key: 'campusPage', title: 'Campus Page'},
        {key: 'clubsPage', title: 'Clubs & Organizations Page'},
        {key: 'collegeCounselingPage', title: 'College Counseling Page'},
        {key: 'employmentPage', title: 'Employment Page'},
        {key: 'facultyPage', title: 'Faculty Page'},
        {key: 'historyPage', title: 'History Page'},
        {key: 'parentsPage', title: 'Parent Association Page'},
        {key: 'tuitionPage', title: 'Tuition & Fees Page'},
        {key: 'visitPage', title: 'Visit Us Page'},
      ].map(page => (
        <AccordionItem key={page.key} value={`item-${page.key}`} className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>{page.title}</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <SectionForm sectionKey={page.key as keyof WebsiteContent} initialData={initialData[page.key as keyof WebsiteContent]} formSchema={simplePageContentSchema}>
                     <FormField control={useFormContext().control} name="title" render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={useFormContext().control} name="description" render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL" />
                     <hr/>
                     <FormField control={useFormContext().control} name="contentTitle" render={({ field }) => ( <FormItem><FormLabel>Main Content Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={useFormContext().control} name="contentBody" render={({ field }) => ( <FormItem><FormLabel>Main Content Body</FormLabel><FormControl><Textarea {...field} className="min-h-[200px]"/></FormControl><FormMessage /></FormItem> )}/>
                </SectionForm>
            </AccordionContent>
        </AccordionItem>
      ))}

        <AccordionItem value="item-missionVisionPage" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Mission & Vision Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                 <SectionForm sectionKey="missionVisionPage" initialData={initialData.missionVisionPage} formSchema={missionVisionPageContentSchema}>
                    <FormField control={useFormContext().control} name="heroTitle" render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={useFormContext().control} name="heroDescription" render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL" />
                    <hr />
                    <FormField control={useFormContext().control} name="missionTitle" render={({ field }) => ( <FormItem><FormLabel>Mission Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={useFormContext().control} name="missionText" render={({ field }) => ( <FormItem><FormLabel>Mission Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="missionImageUrl" label="Mission Image URL" />
                    <hr />
                    <FormField control={useFormContext().control} name="visionTitle" render={({ field }) => ( <FormItem><FormLabel>Vision Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={useFormContext().control} name="visionText" render={({ field }) => ( <FormItem><FormLabel>Vision Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="visionImageUrl" label="Vision Image URL" />
                    <hr />
                    <FormField control={useFormContext().control} name="coreValuesTitle" render={({ field }) => ( <FormItem><FormLabel>Core Values Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={useFormContext().control} name="coreValuesDescription" render={({ field }) => ( <FormItem><FormLabel>Core Values Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    
                    <FormLabel>Core Values</FormLabel>
                    <CoreValuesEditor />
                 </SectionForm>
            </AccordionContent>
        </AccordionItem>
      
    </Accordion>
  );
}


function CoreValuesEditor() {
    const { control } = useFormContext<MissionVisionPageContent>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "coreValues",
    });

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-2 relative">
                    <FormField
                        control={control}
                        name={`coreValues.${index}.title`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value Title</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`coreValues.${index}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value Description</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                onClick={() => append({ title: "", description: "" })}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Core Value
            </Button>
        </div>
    );
}
