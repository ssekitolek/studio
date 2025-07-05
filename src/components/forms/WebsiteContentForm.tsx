
"use client";

import * as React from "react";
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
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

// Schemas
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
const heroSlideshowSectionSchema = z.object({
    buttonText: z.string().min(1),
    buttonLink: z.string().min(1),
    slides: z.array(z.object({
        title: z.string().min(1),
        subtitle: z.string().min(1),
        imageUrls: z.array(z.string().url().or(z.literal(''))).min(1),
    })),
});
const whyUsSectionSchema = z.object({
    heading: z.string().min(1),
    description: z.string().min(1),
    points: z.array(z.object({
        icon: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
    })),
});
const signatureProgramsSectionSchema = z.object({
    heading: z.string().min(1),
    programs: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().url().or(z.literal(''))).min(1),
    })),
});
const newsSectionSchema = z.object({
    heading: z.string().min(1),
    posts: z.array(z.object({
        title: z.string().min(1),
        date: z.string().min(1),
        imageUrls: z.array(z.string().url().or(z.literal(''))).min(1),
    })),
});
const academicsPageSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    programs: z.array(z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().url().or(z.literal(''))).min(1),
    })),
});
const admissionsPageSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    process: z.array(z.object({
        step: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
    })),
    formUrl: z.string().min(1),
});
const studentLifePageSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    features: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().url().or(z.literal(''))).min(1),
    })),
});


// INDIVIDUAL FORM COMPONENTS
function LogoForm({ initialData }: { initialData: WebsiteContent['logoUrl'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<{logoUrl: string}>({ resolver: zodResolver(logoUrlSchema), defaultValues: { logoUrl: initialData }});
    
    const onSubmit = (data: {logoUrl: string}) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('logoUrl', data.logoUrl);
            if (result.success) toast({ title: "Success", description: "Logo updated successfully." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ImageUploadInput fieldName="logoUrl" label="School Logo URL" />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save General
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function ContactPageForm({ initialData }: { initialData: WebsiteContent['contactPage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof contactPageSchema>>({
        resolver: zodResolver(contactPageSchema),
        defaultValues: initialData,
    });

    const onSubmit = (data: z.infer<typeof contactPageSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('contactPage', data);
            if (result.success) {
                toast({ title: "Success", description: "Contact Page content updated successfully." });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="mapImageUrl" label="Map Image URL" />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Contact Page
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function SimplePageForm({ sectionKey, initialData, title }: { sectionKey: keyof WebsiteContent, initialData: SimplePageContent, title: string }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof simplePageContentSchema>>({
        resolver: zodResolver(simplePageContentSchema),
        defaultValues: initialData,
    });
    
    const onSubmit = (data: z.infer<typeof simplePageContentSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection(sectionKey, data);
            if (result.success) toast({ title: "Success", description: `${title} content updated.` });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL" />
                 <hr/>
                 <FormField control={form.control} name="contentTitle" render={({ field }) => ( <FormItem><FormLabel>Main Content Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="contentBody" render={({ field }) => ( <FormItem><FormLabel>Main Content Body</FormLabel><FormControl><Textarea {...field} className="min-h-[200px]"/></FormControl><FormMessage /></FormItem> )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save {title}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function MissionVisionPageForm({ initialData }: { initialData: WebsiteContent['missionVisionPage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof missionVisionPageContentSchema>>({
        resolver: zodResolver(missionVisionPageContentSchema),
        defaultValues: initialData,
    });

    const onSubmit = (data: z.infer<typeof missionVisionPageContentSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('missionVisionPage', data);
            if (result.success) toast({ title: "Success", description: "Mission & Vision Page content updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="heroTitle" render={({ field }) => ( <FormItem><FormLabel>Hero Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="heroDescription" render={({ field }) => ( <FormItem><FormLabel>Hero Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL" />
                <hr />
                <FormField control={form.control} name="missionTitle" render={({ field }) => ( <FormItem><FormLabel>Mission Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="missionText" render={({ field }) => ( <FormItem><FormLabel>Mission Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="missionImageUrl" label="Mission Image URL" />
                <hr />
                <FormField control={form.control} name="visionTitle" render={({ field }) => ( <FormItem><FormLabel>Vision Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="visionText" render={({ field }) => ( <FormItem><FormLabel>Vision Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="visionImageUrl" label="Vision Image URL" />
                <hr />
                <FormField control={form.control} name="coreValuesTitle" render={({ field }) => ( <FormItem><FormLabel>Core Values Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="coreValuesDescription" render={({ field }) => ( <FormItem><FormLabel>Core Values Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <CoreValuesEditor />
                 <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Mission & Vision
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function CoreValuesEditor() {
    const { control } = useFormContext<MissionVisionPageContent>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "coreValues",
    });

    return (
        <div className="space-y-4 p-4 border rounded-md">
            <h4 className="font-semibold text-muted-foreground">Core Values List</h4>
            {fields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-lg space-y-2 relative bg-background/50">
                    <FormField control={control} name={`coreValues.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Value Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name={`coreValues.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Value Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({ title: "", description: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Core Value</Button>
        </div>
    );
}


function createComplexForm<T extends z.ZodType<any, any>>(
    sectionKey: keyof WebsiteContent,
    schema: T,
    title: string,
    initialData: z.infer<T>,
    renderFields: (form: any) => React.ReactNode
) {
    const FormComponent = () => {
        const { toast } = useToast();
        const [isPending, startTransition] = React.useTransition();
        const form = useForm<z.infer<T>>({
            resolver: zodResolver(schema),
            defaultValues: initialData,
        });

        const onSubmit = (data: z.infer<T>) => {
            startTransition(async () => {
                const result = await updateWebsiteSection(sectionKey, data);
                if (result.success) toast({ title: "Success", description: `${title} updated.` });
                else toast({ title: "Error", description: result.message, variant: "destructive" });
            });
        };

        return (
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {renderFields(form)}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save {title}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        );
    };
    FormComponent.displayName = `${title.replace(/\s+/g, '')}Form`;
    return FormComponent;
}



// MAIN COMPONENT
export function WebsiteContentForm({ initialData }: { initialData: WebsiteContent }) {
    
    // Create form components dynamically
    const HeroSlideshowForm = createComplexForm('heroSlideshowSection', heroSlideshowSectionSchema, 'Hero Slideshow', initialData.heroSlideshowSection, (form) => (
        <>
            <FormField control={form.control} name="buttonText" render={({ field }) => ( <FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="buttonLink" render={({ field }) => ( <FormItem><FormLabel>Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="slides" title="Slide" control={form.control} renderItem={(index) => (
                <>
                    <FormField control={form.control} name={`slides.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`slides.${index}.subtitle`} render={({ field }) => ( <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName={`slides.${index}.imageUrls.0`} label="Image URL" />
                </>
            )}/>
        </>
    ));

    const WhyUsForm = createComplexForm('whyUsSection', whyUsSectionSchema, 'Why Us Section', initialData.whyUsSection, (form) => (
        <>
            <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="points" title="Point" control={form.control} renderItem={(index) => (
                <>
                    <FormField control={form.control} name={`points.${index}.icon`} render={({ field }) => ( <FormItem><FormLabel>Icon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`points.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`points.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </>
            )}/>
        </>
    ));

     const SignatureProgramsForm = createComplexForm('signatureProgramsSection', signatureProgramsSectionSchema, 'Signature Programs', initialData.signatureProgramsSection, (form) => (
        <>
            <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="programs" title="Program" control={form.control} renderItem={(index) => (
                <>
                    <FormField control={form.control} name={`programs.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName={`programs.${index}.imageUrls.0`} label="Image URL" />
                </>
            )}/>
        </>
    ));
    
    const NewsForm = createComplexForm('newsSection', newsSectionSchema, 'News Section', initialData.newsSection, (form) => (
         <>
            <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="posts" title="Post" control={form.control} renderItem={(index) => (
                <>
                    <FormField control={form.control} name={`posts.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`posts.${index}.date`} render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName={`posts.${index}.imageUrls.0`} label="Image URL" />
                </>
            )}/>
        </>
    ));

    const AcademicsPageForm = createComplexForm('academicsPage', academicsPageSchema, 'Academics Page', initialData.academicsPage, (form) => (
        <>
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="programs" title="Program" control={form.control} renderItem={(index) => (
                 <>
                    <FormField control={form.control} name={`programs.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName={`programs.${index}.imageUrls.0`} label="Image URL" />
                </>
            )}/>
        </>
    ));

    const AdmissionsPageForm = createComplexForm('admissionsPage', admissionsPageSchema, 'Admissions Page', initialData.admissionsPage, (form) => (
        <>
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="formUrl" render={({ field }) => ( <FormItem><FormLabel>Apply Form URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="process" title="Step" control={form.control} renderItem={(index) => (
                 <>
                    <FormField control={form.control} name={`process.${index}.step`} render={({ field }) => ( <FormItem><FormLabel>Step Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`process.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`process.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </>
            )}/>
        </>
    ));

    const StudentLifePageForm = createComplexForm('studentLifePage', studentLifePageSchema, 'Student Life Page', initialData.studentLifePage, (form) => (
        <>
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <ArrayEditor name="features" title="Feature" control={form.control} renderItem={(index) => (
                <>
                    <FormField control={form.control} name={`features.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`features.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <ImageUploadInput fieldName={`features.${index}.imageUrls.0`} label="Image URL" />
                </>
            )}/>
        </>
    ));
    
    const simplePageForms = [
        {key: 'campusPage', title: 'Campus Page'},
        {key: 'clubsPage', title: 'Clubs & Organizations Page'},
        {key: 'collegeCounselingPage', title: 'College Counseling Page'},
        {key: 'employmentPage', title: 'Employment Page'},
        {key: 'facultyPage', title: 'Faculty Page'},
        {key: 'historyPage', title: 'History Page'},
        {key: 'parentsPage', title: 'Parent Association Page'},
        {key: 'tuitionPage', title: 'Tuition & Fees Page'},
        {key: 'visitPage', title: 'Visit Us Page'},
    ];


    return (
        <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="item-general" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><LogoForm initialData={initialData.logoUrl} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-hero" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Hero Slideshow</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><HeroSlideshowForm/></AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-whyus" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Why Us</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><WhyUsForm/></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-sigprog" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Signature Programs</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><SignatureProgramsForm/></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-news" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: News Section</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><NewsForm/></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-academics" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Academics Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AcademicsPageForm/></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-admissions" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Admissions Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AdmissionsPageForm/></AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-studentlife" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Student Life Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><StudentLifePageForm/></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-contact" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Contact Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><ContactPageForm initialData={initialData.contactPage} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-mission" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Mission & Vision Page</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><MissionVisionPageForm initialData={initialData.missionVisionPage} /></AccordionContent>
            </AccordionItem>
            {simplePageForms.map(page => (
                <AccordionItem key={page.key} value={`item-${page.key}`} className="border rounded-lg bg-card">
                    <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>{page.title}</CardTitle></AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <SimplePageForm sectionKey={page.key as keyof WebsiteContent} initialData={initialData[page.key as keyof WebsiteContent]} title={page.title} />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}


function ArrayEditor({ name, title, control, renderItem }: { name: string, title: string, control: any, renderItem: (index: number) => React.ReactNode }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    return (
        <div className="space-y-4 p-4 border rounded-md">
            <h4 className="font-semibold text-muted-foreground">{title} List</h4>
            {fields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-lg space-y-2 relative bg-background/50">
                    {renderItem(index)}
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({})}><PlusCircle className="mr-2 h-4 w-4" /> Add {title}</Button>
        </div>
    );
}
