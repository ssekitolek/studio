

"use client";

import * as React from "react";
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
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
import type { WebsiteContent, SimplePageContent } from "@/lib/types";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";

const simplePageContentSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    heroImageUrl: z.string().url("Must be a valid URL for the hero image.").or(z.literal('')),
    contentTitle: z.string().min(1, "Content title is required."),
    contentBody: z.string().min(1, "Content body is required."),
});

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
  academicsPage: z.object({
      title: z.string().min(1, "Title is required."),
      description: z.string().min(1, "Description is required."),
      programs: z.array(z.object({
          name: z.string().min(1, "Program name is required."),
          description: z.string().min(1, "Program description is required."),
          imageUrls: z.array(z.string().url("Must be a valid URL.")).min(1, "At least one image URL is required."),
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
      phone: z.string().min(1, "Phone number is required."),
      email: z.string().email("Must be a valid email."),
      mapImageUrl: z.string().url("Must be a valid URL for the map image."),
  }),
  studentLifePage: z.object({
      title: z.string().min(1, "Title is required."),
      description: z.string().min(1, "Description is required."),
      features: z.array(z.object({
          title: z.string().min(1, "Feature title is required."),
          description: z.string().min(1, "Feature description is required."),
          imageUrls: z.array(z.string().url("Must be a valid URL.")).min(1, "At least one image URL is required."),
      })),
  }),
  missionVisionPage: z.object({
    heroTitle: z.string().min(1, "Title is required."),
    heroDescription: z.string().min(1, "Description is required."),
    heroImageUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
    missionTitle: z.string().min(1, "Mission title is required."),
    missionText: z.string().min(1, "Mission text is required."),
    missionImageUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
    visionTitle: z.string().min(1, "Vision title is required."),
    visionText: z.string().min(1, "Vision text is required."),
    visionImageUrl: z.string().url("Must be a valid URL.").or(z.literal('')),
    coreValuesTitle: z.string().min(1, "Core values title is required."),
    coreValuesDescription: z.string().min(1, "Core values description is required."),
    coreValues: z.array(z.object({
        title: z.string().min(1, "Value title is required."),
        description: z.string().min(1, "Value description is required."),
    })),
  }),
  campusPage: simplePageContentSchema,
  clubsPage: simplePageContentSchema,
  collegeCounselingPage: simplePageContentSchema,
  employmentPage: simplePageContentSchema,
  facultyPage: simplePageContentSchema,
  historyPage: simplePageContentSchema,
  parentsPage: simplePageContentSchema,
  tuitionPage: simplePageContentSchema,
  visitPage: simplePageContentSchema,
});

type WebsiteContentFormValues = z.infer<typeof websiteContentSchema>;

interface WebsiteContentFormProps {
  initialData: WebsiteContent;
}

const SimplePageFormSection = ({ pageName, title }: { pageName: keyof WebsiteContent, title: string }) => {
    const { control } = useFormContext<WebsiteContentFormValues>();
    
    return (
        <AccordionItem value={`item-${pageName}`} className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>{title}</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                 <FormField control={control} name={`${pageName}.title`} render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={control} name={`${pageName}.description`} render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <ImageUploadInput fieldName={`${pageName}.heroImageUrl`} label="Hero Image URL" />
                 <hr/>
                 <FormField control={control} name={`${pageName}.contentTitle`} render={({ field }) => ( <FormItem><FormLabel>Main Content Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={control} name={`${pageName}.contentBody`} render={({ field }) => ( <FormItem><FormLabel>Main Content Body</FormLabel><FormControl><Textarea {...field} className="min-h-[200px]"/></FormControl><FormMessage /></FormItem> )}/>
            </AccordionContent>
        </AccordionItem>
    );
};

export function WebsiteContentForm({ initialData }: WebsiteContentFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<WebsiteContentFormValues>({
    resolver: zodResolver(websiteContentSchema),
    defaultValues: initialData,
  });

  const { control } = form;

  const { fields: heroSlides, append: appendHeroSlide, remove: removeHeroSlide } = useFieldArray({ control, name: "heroSlideshowSection.slides" });
  const { fields: whyUsPoints, append: appendWhyUsPoint, remove: removeWhyUsPoint } = useFieldArray({ control, name: "whyUsSection.points" });
  const { fields: signaturePrograms, append: appendProgram, remove: removeProgram } = useFieldArray({ control, name: "signatureProgramsSection.programs" });
  const { fields: newsPosts, append: appendNews, remove: removeNews } = useFieldArray({ control, name: "newsSection.posts" });
  const { fields: academicPrograms, append: appendAcademicProgram, remove: removeAcademicProgram } = useFieldArray({ control, name: "academicsPage.programs" });
  const { fields: admissionProcess, append: appendAdmissionStep, remove: removeAdmissionStep } = useFieldArray({ control, name: "admissionsPage.process" });
  const { fields: studentLifeFeatures, append: appendFeature, remove: removeFeature } = useFieldArray({ control, name: "studentLifePage.features" });
  const { fields: coreValues, append: appendCoreValue, remove: removeCoreValue } = useFieldArray({ control, name: "missionVisionPage.coreValues" });
  
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
        <Accordion type="multiple" defaultValue={["item-general"]} className="w-full space-y-4">
          
          <AccordionItem value="item-general" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
               <ImageUploadInput fieldName="logoUrl" label="School Logo URL" />
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-heroSlideshow" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Hero Slideshow Section</CardTitle></AccordionTrigger>
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
                                  <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("https://placehold.co/1920x1080.png")}>Add Image URL</Button>
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
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Why Us Section</CardTitle></AccordionTrigger>
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
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Signature Programs Section</CardTitle></AccordionTrigger>
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
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("https://placehold.co/600x400.png")}>Add Image URL</Button>
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
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: News Section</CardTitle></AccordionTrigger>
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
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("https://placehold.co/600x400.png")}>Add Image URL</Button>
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
          
           <AccordionItem value="item-academics" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Academics Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="academicsPage.title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="academicsPage.description" render={({ field }) => ( <FormItem><FormLabel>Page Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Card>
                    <CardHeader><CardTitle className="text-base">Programs</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {academicPrograms.map((field, index) => {
                          const { fields: imageUrls, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({ control, name: `academicsPage.programs.${index}.imageUrls` });
                          return (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`academicsPage.programs.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Program Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`academicsPage.programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <div className="space-y-2">
                                      <FormLabel>Image URLs</FormLabel>
                                      {imageUrls.map((imgField, imgIndex) => (
                                        <div key={imgField.id} className="flex items-center gap-2">
                                          <ImageUploadInput fieldName={`academicsPage.programs.${index}.imageUrls.${imgIndex}`} label={`Image ${imgIndex + 1}`}/>
                                          <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(imgIndex)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                      ))}
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("https://placehold.co/600x400.png")}>Add Image URL</Button>
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeAcademicProgram(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                          );
                        })}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAcademicProgram({ name: "", description: "", imageUrls: ["https://placehold.co/600x400.png"] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Program </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
           </AccordionItem>

           <AccordionItem value="item-admissions" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Admissions Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="admissionsPage.title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="admissionsPage.description" render={({ field }) => ( <FormItem><FormLabel>Page Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="admissionsPage.formUrl" render={({ field }) => ( <FormItem><FormLabel>Apply Now Form URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Card>
                    <CardHeader><CardTitle className="text-base">Admission Process Steps</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {admissionProcess.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`admissionsPage.process.${index}.step`} render={({ field }) => ( <FormItem><FormLabel>Step Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`admissionsPage.process.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Step Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`admissionsPage.process.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Step Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeAdmissionStep(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAdmissionStep({ step: "05", title: "", description: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Step </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
           </AccordionItem>
           
           <AccordionItem value="item-contact" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Contact Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="contactPage.title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="contactPage.address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="contactPage.phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="contactPage.email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="contactPage.mapImageUrl" label="Map Image URL" />
            </AccordionContent>
           </AccordionItem>

           <AccordionItem value="item-student-life" className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Student Life Page</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0 space-y-4">
                <FormField control={control} name="studentLifePage.title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="studentLifePage.description" render={({ field }) => ( <FormItem><FormLabel>Page Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <Card>
                    <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {studentLifeFeatures.map((field, index) => {
                           const { fields: imageUrls, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({ control, name: `studentLifePage.features.${index}.imageUrls` });
                           return (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="flex-grow space-y-4">
                                    <FormField control={control} name={`studentLifePage.features.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={control} name={`studentLifePage.features.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <div className="space-y-2">
                                      <FormLabel>Image URLs</FormLabel>
                                      {imageUrls.map((imgField, imgIndex) => (
                                        <div key={imgField.id} className="flex items-center gap-2">
                                          <ImageUploadInput fieldName={`studentLifePage.features.${index}.imageUrls.${imgIndex}`} label={`Image ${imgIndex + 1}`}/>
                                          <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrl(imgIndex)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                      ))}
                                      <Button type="button" variant="outline" size="sm" onClick={() => appendImageUrl("https://placehold.co/600x400.png")}>Add Image URL</Button>
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeFeature(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            </div>
                           );
                        })}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendFeature({ title: "", description: "", imageUrls: ["https://placehold.co/600x400.png"] })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Feature </Button>
                    </CardContent>
                </Card>
            </AccordionContent>
           </AccordionItem>
          
           <AccordionItem value="item-mission-vision" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Mission & Vision Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-4">
                    <FormField control={control} name="missionVisionPage.heroTitle" render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="missionVisionPage.heroDescription" render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="missionVisionPage.heroImageUrl" label="Hero Image URL" />
                    <hr/>
                    <FormField control={control} name="missionVisionPage.missionTitle" render={({ field }) => ( <FormItem><FormLabel>Mission Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="missionVisionPage.missionText" render={({ field }) => ( <FormItem><FormLabel>Mission Text</FormLabel><FormControl><Textarea {...field} className="min-h-[150px]"/></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="missionVisionPage.missionImageUrl" label="Mission Image URL" />
                    <hr/>
                    <FormField control={control} name="missionVisionPage.visionTitle" render={({ field }) => ( <FormItem><FormLabel>Vision Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="missionVisionPage.visionText" render={({ field }) => ( <FormItem><FormLabel>Vision Text</FormLabel><FormControl><Textarea {...field} className="min-h-[150px]"/></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName="missionVisionPage.visionImageUrl" label="Vision Image URL" />
                    <hr/>
                    <FormField control={control} name="missionVisionPage.coreValuesTitle" render={({ field }) => ( <FormItem><FormLabel>Core Values Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="missionVisionPage.coreValuesDescription" render={({ field }) => ( <FormItem><FormLabel>Core Values Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <Card>
                        <CardHeader><CardTitle className="text-base">Core Values</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {coreValues.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                    <div className="flex-grow space-y-4">
                                        <FormField control={control} name={`missionVisionPage.coreValues.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Value Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={control} name={`missionVisionPage.coreValues.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Value Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeCoreValue(index)}> <Trash2 className="h-4 w-4" /> </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCoreValue({ title: "", description: "" })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Core Value </Button>
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>

            <SimplePageFormSection pageName="campusPage" title="Campus Page"/>
            <SimplePageFormSection pageName="clubsPage" title="Clubs & Organizations Page"/>
            <SimplePageFormSection pageName="collegeCounselingPage" title="College Counseling Page"/>
            <SimplePageFormSection pageName="employmentPage" title="Employment Page"/>
            <SimplePageFormSection pageName="facultyPage" title="Faculty Page"/>
            <SimplePageFormSection pageName="historyPage" title="History Page"/>
            <SimplePageFormSection pageName="parentsPage" title="Parent Association Page"/>
            <SimplePageFormSection pageName="tuitionPage" title="Tuition & Fees Page"/>
            <SimplePageFormSection pageName="visitPage" title="Visit Us Page"/>

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
