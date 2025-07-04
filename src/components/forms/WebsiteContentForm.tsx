
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";

const websiteContentSchema = z.object({
  logoUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
  heroSection: z.object({
    heading: z.string().min(1, "Heading is required."),
    subheading: z.string().min(1, "Subheading is required."),
    imageUrl: z.string().url("Must be a valid URL."),
    primaryCtaText: z.string().min(1, "Button text is required."),
    primaryCtaLink: z.string().min(1, "Button link is required."),
    secondaryCtaText: z.string().min(1, "Button text is required."),
    secondaryCtaLink: z.string().min(1, "Button link is required."),
  }),
  whyUsSection: z.object({
    heading: z.string().min(1, "Heading is required."),
    description: z.string().min(1, "Description is required."),
    points: z.array(z.object({
      icon: z.string().min(1, "Icon name is required."),
      title: z.string().min(1, "Point title is required."),
      description: z.string().min(1, "Point description is required."),
    })),
  }),
  inquireApplySection: z.object({
    heading: z.string().min(1, "Heading is required."),
    inquireText: z.string().min(1, "Inquire button text is required."),
    inquireLink: z.string().min(1, "Inquire link is required."),
    applyText: z.string().min(1, "Apply button text is required."),
    applyLink: z.string().min(1, "Apply link is required."),
  }),
  signatureProgramsSection: z.object({
      heading: z.string().min(1, "Heading is required."),
      programs: z.array(z.object({
          title: z.string().min(1, "Program title is required."),
          description: z.string().min(1, "Program description is required."),
          imageUrl: z.string().url("Must be a valid URL."),
      })),
  }),
  newsSection: z.object({
      heading: z.string().min(1, "Heading is required."),
      posts: z.array(z.object({
          title: z.string().min(1, "Post title is required."),
          date: z.string().min(1, "Date is required."),
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
    // We only manage a subset of the full WebsiteContent type here.
    defaultValues: {
      logoUrl: initialData.logoUrl,
      heroSection: initialData.heroSection,
      whyUsSection: initialData.whyUsSection,
      inquireApplySection: initialData.inquireApplySection,
      signatureProgramsSection: initialData.signatureProgramsSection,
      newsSection: initialData.newsSection,
    },
  });

  const { control } = form;

  const { fields: whyUsPoints, append: appendWhyUsPoint, remove: removeWhyUsPoint } = useFieldArray({ control, name: "whyUsSection.points" });
  const { fields: signaturePrograms, append: appendProgram, remove: removeProgram } = useFieldArray({ control, name: "signatureProgramsSection.programs" });
  const { fields: newsPosts, append: appendNews, remove: removeNews } = useFieldArray({ control, name: "newsSection.posts" });
  
  const onSubmit = (data: WebsiteContentFormValues) => {
    startTransition(async () => {
      // Merge the form data with the full initial data to avoid overwriting other pages' content
      const fullContentToSave = {
        ...initialData,
        ...data
      };
      const result = await updateWebsiteContent(fullContentToSave);
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
          
          <AccordionItem value="item-general" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
               <ImageUploadInput fieldName="logoUrl" label="School Logo URL" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-1" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Hero Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="heroSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="heroSection.subheading" render={({ field }) => ( <FormItem><FormLabel>Subheading</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="heroSection.imageUrl" label="Background Image URL" />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="heroSection.primaryCtaText" render={({ field }) => ( <FormItem><FormLabel>Primary Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="heroSection.primaryCtaLink" render={({ field }) => ( <FormItem><FormLabel>Primary Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="heroSection.secondaryCtaText" render={({ field }) => ( <FormItem><FormLabel>Secondary Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="heroSection.secondaryCtaLink" render={({ field }) => ( <FormItem><FormLabel>Secondary Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Why Us Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="whyUsSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="whyUsSection.description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Card>
                    <CardHeader><CardTitle className="text-base">Points</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {whyUsPoints.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`whyUsSection.points.${index}.icon`} render={({ field }) => ( <FormItem><FormLabel>Icon Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`whyUsSection.points.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`whyUsSection.points.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeWhyUsPoint(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendWhyUsPoint({ icon: "Users", title: "", description: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Point </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Inquire/Apply Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="inquireApplySection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="inquireApplySection.inquireText" render={({ field }) => ( <FormItem><FormLabel>Inquire Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="inquireApplySection.inquireLink" render={({ field }) => ( <FormItem><FormLabel>Inquire Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="inquireApplySection.applyText" render={({ field }) => ( <FormItem><FormLabel>Apply Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="inquireApplySection.applyLink" render={({ field }) => ( <FormItem><FormLabel>Apply Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="item-4" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Signature Programs Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="signatureProgramsSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <Card>
                    <CardHeader><CardTitle className="text-base">Programs</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {signaturePrograms.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`signatureProgramsSection.programs.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`signatureProgramsSection.programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <ImageUploadInput fieldName={`signatureProgramsSection.programs.${index}.imageUrl`} label="Image URL" />
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeProgram(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendProgram({ title: "", description: "", imageUrl: "https://placehold.co/600x400.png" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Program </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
          </AccordionItem>

           <AccordionItem value="item-5" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>News Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="newsSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <Card>
                    <CardHeader><CardTitle className="text-base">News Posts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {newsPosts.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`newsSection.posts.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`newsSection.posts.${index}.date`} render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <ImageUploadInput fieldName={`newsSection.posts.${index}.imageUrl`} label="Image URL" />
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeNews(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendNews({ title: "", date: "", imageUrl: "https://placehold.co/600x400.png" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add News Post </Button>
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
