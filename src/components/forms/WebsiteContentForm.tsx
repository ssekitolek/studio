
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
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";

const websiteContentSchema = z.object({
  logoUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
  heroSlideshowSection: z.object({
    buttonText: z.string().min(1, "Button text is required."),
    buttonLink: z.string().min(1, "Button link is required."),
    slides: z.array(z.object({
        title: z.string().min(1, "Slide title is required."),
        subtitle: z.string().min(1, "Slide subtitle is required."),
        imageUrls: z.array(z.string().url("Must be a valid URL.")).min(1, "At least one image URL is required."),
    })),
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
  signatureProgramsSection: z.object({
      heading: z.string().min(1, "Heading is required."),
      programs: z.array(z.object({
          title: z.string().min(1, "Program title is required."),
          description: z.string().min(1, "Program description is required."),
          imageUrls: z.array(z.string().url("Must be a valid URL.")).min(1, "At least one image URL is required."),
      })),
  }),
  newsSection: z.object({
      heading: z.string().min(1, "Heading is required."),
      posts: z.array(z.object({
          title: z.string().min(1, "Post title is required."),
          date: z.string().min(1, "Date is required."),
          imageUrls: z.array(z.string().url("Must be a valid URL.")).min(1, "At least one image URL is required."),
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
    defaultValues: {
      logoUrl: initialData.logoUrl,
      heroSlideshowSection: initialData.heroSlideshowSection,
      whyUsSection: initialData.whyUsSection,
      signatureProgramsSection: initialData.signatureProgramsSection,
      newsSection: initialData.newsSection,
    },
  });

  const { control } = form;

  const { fields: heroSlides, append: appendHeroSlide, remove: removeHeroSlide } = useFieldArray({ control, name: "heroSlideshowSection.slides" });
  const { fields: whyUsPoints, append: appendWhyUsPoint, remove: removeWhyUsPoint } = useFieldArray({ control, name: "whyUsSection.points" });
  const { fields: signaturePrograms, append: appendProgram, remove: removeProgram } = useFieldArray({ control, name: "signatureProgramsSection.programs" });
  const { fields: newsPosts, append: appendNews, remove: removeNews } = useFieldArray({ control, name: "newsSection.posts" });
  
  const onSubmit = (data: WebsiteContentFormValues) => {
    startTransition(async () => {
      const fullContentToSave: WebsiteContent = {
        ...initialData,
        logoUrl: data.logoUrl,
        heroSlideshowSection: data.heroSlideshowSection,
        whyUsSection: data.whyUsSection,
        signatureProgramsSection: data.signatureProgramsSection,
        newsSection: data.newsSection,
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
        <Accordion type="multiple" defaultValue={["item-general", "item-heroSlideshow"]} className="w-full space-y-4">
          
          <AccordionItem value="item-general" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
               <ImageUploadInput fieldName="logoUrl" label="School Logo URL" />
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-heroSlideshow" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Hero Slideshow Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="heroSlideshowSection.buttonText" render={({ field }) => ( <FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="heroSlideshowSection.buttonLink" render={({ field }) => ( <FormItem><FormLabel>Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <Card>
                <CardHeader>
                    <CardTitle className="text-base">Slides</CardTitle>
                    <CardDescription>Manage the slides for the hero section.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {heroSlides.map((field, index) => {
                    const { fields: imageUrls, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({ control, name: `heroSlideshowSection.slides.${index}.imageUrls` });
                    return (
                        <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                            <div className="flex-grow space-y-4">
                                <FormField control={control} name={`heroSlideshowSection.slides.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name={`heroSlideshowSection.slides.${index}.subtitle`} render={({ field }) => ( <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <div className="space-y-2">
                                  <FormLabel>Image URLs</FormLabel>
                                  {imageUrls.map((imgField, imgIndex) => (
                                    <div key={imgField.id} className="flex items-center gap-2">
                                      <ImageUploadInput fieldName={`heroSlideshowSection.slides.${index}.imageUrls.${imgIndex}`} label={`Image ${imgIndex + 1}`}/>
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(imgIndex)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("")}>Add Image URL</Button>
                                </div>
                            </div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeHeroSlide(index)}> <Trash2 className="h-4 w-4" /> </Button>
                        </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendHeroSlide({ title: "New Slide", subtitle: "New subtitle", imageUrls: ["https://placehold.co/1920x1080.png"] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Slide </Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-whyUs" className="border rounded-lg bg-card">
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
          
           <AccordionItem value="item-programs" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Signature Programs Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="signatureProgramsSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <Card>
                    <CardHeader><CardTitle className="text-base">Programs</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {signaturePrograms.map((field, index) => {
                           const { fields: imageUrls, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({ control, name: `signatureProgramsSection.programs.${index}.imageUrls` });
                           return (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`signatureProgramsSection.programs.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`signatureProgramsSection.programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <div className="space-y-2">
                                      <FormLabel>Image URLs</FormLabel>
                                      {imageUrls.map((imgField, imgIndex) => (
                                        <div key={imgField.id} className="flex items-center gap-2">
                                          <ImageUploadInput fieldName={`signatureProgramsSection.programs.${index}.imageUrls.${imgIndex}`} label={`Image ${imgIndex + 1}`}/>
                                          <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(imgIndex)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                      ))}
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("")}>Add Image URL</Button>
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeProgram(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                           );
                        })}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendProgram({ title: "", description: "", imageUrls: ["https://placehold.co/600x400.png"] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Program </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
          </AccordionItem>

           <AccordionItem value="item-news" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>News Section</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="newsSection.heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <Card>
                    <CardHeader><CardTitle className="text-base">News Posts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {newsPosts.map((field, index) => {
                          const { fields: imageUrls, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({ control, name: `newsSection.posts.${index}.imageUrls` });
                          return (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`newsSection.posts.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`newsSection.posts.${index}.date`} render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <div className="space-y-2">
                                      <FormLabel>Image URLs</FormLabel>
                                      {imageUrls.map((imgField, imgIndex) => (
                                        <div key={imgField.id} className="flex items-center gap-2">
                                          <ImageUploadInput fieldName={`newsSection.posts.${index}.imageUrls.${imgIndex}`} label={`Image ${imgIndex + 1}`}/>
                                          <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(imgIndex)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                      ))}
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("")}>Add Image URL</Button>
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeNews(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                          );
                        })}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendNews({ title: "", date: "", imageUrls: ["https://placehold.co/600x400.png"] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add News Post </Button>
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
