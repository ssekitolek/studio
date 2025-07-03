
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateWebsiteContent } from "@/lib/actions/website-actions";
import type { WebsiteContent } from "@/lib/types";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const websiteContentSchema = z.object({
  logoUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  hero: z.object({
    title: z.string().min(1, "Hero title is required."),
    subtitle: z.string().min(1, "Hero subtitle is required."),
    imageUrl: z.string().url("Must be a valid URL."),
  }),
  atAGlance: z.array(z.object({
    label: z.string().min(1, "Label is required."),
    value: z.string().min(1, "Value is required."),
  })),
  programHighlights: z.array(z.object({
    title: z.string().min(1, "Highlight title is required."),
    description: z.string().min(1, "Highlight description is required."),
    imageUrl: z.string().url("Must be a valid URL."),
  })).length(3, "There must be exactly 3 program highlights."),
  community: z.object({
      title: z.string().min(1, "Community title is required."),
      description: z.string().min(1, "Community description is required."),
      imageUrl: z.string().url("Must be a valid URL."),
  }),
  news: z.array(z.object({
    title: z.string().min(1, "News title is required."),
    date: z.string().min(1, "News date is required."),
    description: z.string().min(1, "News description is required."),
    imageUrl: z.string().url("Must be a valid URL."),
  })).length(3, "There must be exactly 3 news items."),
  callToAction: z.object({
    title: z.string().min(1, "CTA title is required."),
    description: z.string().min(1, "CTA description is required."),
    buttonText: z.string().min(1, "Button text is required."),
    buttonLink: z.string().min(1, "Button link is required."),
  }),
  academicsPage: z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    programs: z.array(z.object({
      name: z.string().min(1, "Program name is required."),
      description: z.string().min(1, "Program description is required."),
      imageUrl: z.string().url("Must be a valid URL."),
    })),
  }),
  admissionsPage: z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    process: z.array(z.object({
      step: z.string().min(1, "Step number is required."),
      title: z.string().min(1, "Step title is required."),
      description: z.string().min(1, "Step description is required."),
    })),
    formUrl: z.string().min(1, "Form URL is required."),
  }),
  contactPage: z.object({
    title: z.string().min(1, "Title is required."),
    address: z.string().min(1, "Address is required."),
    phone: z.string().min(1, "Phone is required."),
    email: z.string().email("Must be a valid email."),
    mapImageUrl: z.string().url("Must be a valid URL."),
  }),
  studentLifePage: z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    features: z.array(z.object({
      title: z.string().min(1, "Feature title is required."),
      description: z.string().min(1, "Feature description is required."),
      imageUrl: z.string().url("Must be a valid URL."),
    })),
  }),
});

type WebsiteContentFormValues = z.infer<typeof websiteContentSchema>;

interface WebsiteContentFormProps {
  initialData: WebsiteContent;
}

export function WebsiteContentForm({ initialData }: WebsiteContentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<WebsiteContentFormValues>({
    resolver: zodResolver(websiteContentSchema),
    defaultValues: initialData,
  });

  const { fields: atAGlanceFields, append: appendStat, remove: removeStat } = useFieldArray({ control: form.control, name: "atAGlance" });
  const { fields: programHighlightFields } = useFieldArray({ control: form.control, name: "programHighlights" });
  const { fields: newsFields } = useFieldArray({ control: form.control, name: "news" });
  const { fields: academicProgramsFields, append: appendProgram, remove: removeProgram } = useFieldArray({ control: form.control, name: "academicsPage.programs" });
  const { fields: admissionProcessFields, append: appendProcess, remove: removeProcess } = useFieldArray({ control: form.control, name: "admissionsPage.process" });
  const { fields: studentLifeFeatures, append: appendFeature, remove: removeFeature } = useFieldArray({ control: form.control, name: "studentLifePage.features" });

  const onSubmit = (data: WebsiteContentFormValues) => {
    startTransition(async () => {
      const result = await updateWebsiteContent(data);
      if (result.success) {
        toast({ title: "Success", description: "Website content updated successfully." });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Accordion type="multiple" defaultValue={["item-1"]} className="w-full space-y-4">

          <AccordionItem value="item-1" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage Content</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
               {/* Logo and Hero Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Header & Hero Section</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem> <FormLabel>Logo Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="hero.title" render={({ field }) => ( <FormItem> <FormLabel>Hero Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="hero.subtitle" render={({ field }) => ( <FormItem> <FormLabel>Hero Subtitle</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="hero.imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Hero Background Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>

              {/* At a Glance Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">At a Glance Section</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {atAGlanceFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <FormField control={form.control} name={`atAGlance.${index}.label`} render={({ field }) => ( <FormItem className="flex-grow"> <FormLabel>Label</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`atAGlance.${index}.value`} render={({ field }) => ( <FormItem className="flex-grow"> <FormLabel>Value</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeStat(index)}> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendStat({ label: "", value: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Stat </Button>
                </CardContent>
              </Card>

              {/* Program Highlights Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Program Highlights Section</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {programHighlightFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <h4 className="font-semibold">Highlight {index + 1}</h4>
                      <FormField control={form.control} name={`programHighlights.${index}.title`} render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`programHighlights.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`programHighlights.${index}.imageUrl`} render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Community Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Community Section</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="community.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="community.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="community.imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>
              
              {/* News Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">News & Events Section</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {newsFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <h4 className="font-semibold">News Item {index + 1}</h4>
                      <FormField control={form.control} name={`news.${index}.title`} render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`news.${index}.date`} render={({ field }) => ( <FormItem> <FormLabel>Date</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`news.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name={`news.${index}.imageUrl`} render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Call to Action Section */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Call to Action Section</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="callToAction.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="callToAction.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="callToAction.buttonText" render={({ field }) => ( <FormItem> <FormLabel>Button Text</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="callToAction.buttonLink" render={({ field }) => ( <FormItem> <FormLabel>Button Link</FormLabel> <FormControl><Input placeholder="#" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Academics Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
              <FormField control={form.control} name="academicsPage.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="academicsPage.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <Card>
                <CardHeader><CardTitle className="text-lg">Programs</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {academicProgramsFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-grow space-y-4">
                        <FormField control={form.control} name={`academicsPage.programs.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel>Program Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`academicsPage.programs.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Program Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`academicsPage.programs.${index}.imageUrl`} render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      </div>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeProgram(index)}> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendProgram({ name: "", description: "", imageUrl: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Program </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Admissions Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
              <FormField control={form.control} name="admissionsPage.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="admissionsPage.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="admissionsPage.formUrl" render={({ field }) => ( <FormItem> <FormLabel>Application Form URL</FormLabel> <FormControl><Input placeholder="#" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <Card>
                <CardHeader><CardTitle className="text-lg">Admission Process Steps</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {admissionProcessFields.map((field, index) => (
                     <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-grow space-y-4">
                        <FormField control={form.control} name={`admissionsPage.process.${index}.step`} render={({ field }) => ( <FormItem> <FormLabel>Step Number</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`admissionsPage.process.${index}.title`} render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`admissionsPage.process.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      </div>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeProcess(index)}> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  ))}
                   <Button type="button" variant="outline" size="sm" onClick={() => appendProcess({ step: "", title: "", description: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Step </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Contact Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
              <FormField control={form.control} name="contactPage.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="contactPage.address" render={({ field }) => ( <FormItem> <FormLabel>Address</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="contactPage.phone" render={({ field }) => ( <FormItem> <FormLabel>Phone Number</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="contactPage.email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="contactPage.mapImageUrl" render={({ field }) => ( <FormItem> <FormLabel>Map Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-5" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Student Life Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
              <FormField control={form.control} name="studentLifePage.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="studentLifePage.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <Card>
                <CardHeader><CardTitle className="text-lg">Features</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {studentLifeFeatures.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-grow space-y-4">
                        <FormField control={form.control} name={`studentLifePage.features.${index}.title`} render={({ field }) => ( <FormItem> <FormLabel>Feature Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`studentLifePage.features.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Feature Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name={`studentLifePage.features.${index}.imageUrl`} render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                      </div>
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeFeature(index)}> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendFeature({ title: "", description: "", imageUrl: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Feature </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Update Website Content
          </Button>
        </div>
      </form>
    </Form>
  );
}
