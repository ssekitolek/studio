

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
import type { WebsiteContent, SimplePageContent } from "@/lib/types";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageUploadInput } from "@/components/shared/ImageUploadInput";

// Schemas
const logoUrlSchema = z.object({ logoUrl: z.string().or(z.literal('')) });
const contactPageSchema = z.object({
      title: z.string().min(1, "Title is required."),
      address: z.string().min(1, "Address is required."),
      phone: z.string().min(1, "Phone number is required."),
      email: z.string().email("Must be a valid email."),
      mapImageUrl: z.string().or(z.literal('')),
});
const simplePageContentSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    heroImageUrl: z.string().or(z.literal('')),
    contentTitle: z.string().min(1, "Content title is required."),
    contentBody: z.string().min(1, "Content body is required."),
});
const missionVisionPageContentSchema = z.object({
    heroTitle: z.string().min(1),
    heroDescription: z.string().min(1),
    heroImageUrl: z.string().or(z.literal('')),
    missionTitle: z.string().min(1),
    missionText: z.string().min(1),
    missionImageUrl: z.string().or(z.literal('')),
    visionTitle: z.string().min(1),
    visionText: z.string().min(1),
    visionImageUrl: z.string().or(z.literal('')),
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
        imageUrls: z.array(z.string().or(z.literal(''))),
    })),
});
const whyUsSectionSchema = z.object({
    heading: z.string().min(1),
    description: z.string().min(1),
    points: z.array(z.object({
        icon: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().or(z.literal('')),
    })),
});
const signatureProgramsSectionSchema = z.object({
    heading: z.string().min(1),
    programs: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().or(z.literal(''))),
    })),
});
const administrationSectionSchema = z.object({
    heading: z.string().min(1),
    administrators: z.array(z.object({
        name: z.string().min(1),
        title: z.string().min(1),
        imageUrl: z.string().or(z.literal('')),
    })),
});
const newsSectionSchema = z.object({
    heading: z.string().min(1),
    posts: z.array(z.object({
        title: z.string().min(1),
        date: z.string().min(1),
        imageUrls: z.array(z.string().or(z.literal(''))),
    })),
});
const academicsPageSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    programs: z.array(z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().or(z.literal(''))),
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
        imageUrls: z.array(z.string().or(z.literal(''))),
    })),
});
const housesPageSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    heroImageUrl: z.string().or(z.literal('')),
    houses: z.array(z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        imageUrls: z.array(z.string().or(z.literal(''))),
    })),
});
const alumniSpotlightSectionSchema = z.object({
    heading: z.string().min(1),
    description: z.string().min(1),
    spotlights: z.array(z.object({
        name: z.string().min(1),
        graduationYear: z.string().min(1),
        quote: z.string().min(1),
        imageUrl: z.string().or(z.literal('')),
    })),
});


function ArrayEditor({ name, title, control, renderItem, defaultItem }: { name: string, title: string, control: any, renderItem: (index: number) => React.ReactNode, defaultItem: any }) {
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
            <Button type="button" variant="outline" onClick={() => append(defaultItem)}><PlusCircle className="mr-2 h-4 w-4" /> Add {title}</Button>
        </div>
    );
}

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
                 <ImageUploadInput fieldName="logoUrl" label="School Logo URL"/>
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
                <ImageUploadInput fieldName="mapImageUrl" label="Map Image URL"/>
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
                <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL"/>
                <hr />
                <FormField control={form.control} name="missionTitle" render={({ field }) => ( <FormItem><FormLabel>Mission Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="missionText" render={({ field }) => ( <FormItem><FormLabel>Mission Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="missionImageUrl" label="Mission Image URL"/>
                <hr />
                <FormField control={form.control} name="visionTitle" render={({ field }) => ( <FormItem><FormLabel>Vision Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="visionText" render={({ field }) => ( <FormItem><FormLabel>Vision Text</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="visionImageUrl" label="Vision Image URL"/>
                <hr />
                <FormField control={form.control} name="coreValuesTitle" render={({ field }) => ( <FormItem><FormLabel>Core Values Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="coreValuesDescription" render={({ field }) => ( <FormItem><FormLabel>Core Values Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="coreValues" title="Core Value" control={form.control} defaultItem={{ title: '', description: '' }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`coreValues.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Value Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`coreValues.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Value Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </>
                )}/>
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

function HeroSlideshowForm({ initialData }: { initialData: WebsiteContent['heroSlideshowSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof heroSlideshowSectionSchema>>({
        resolver: zodResolver(heroSlideshowSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof heroSlideshowSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('heroSlideshowSection', data);
            if (result.success) toast({ title: "Success", description: "Hero Slideshow updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={control} name="buttonText" render={({ field }) => ( <FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="buttonLink" render={({ field }) => ( <FormItem><FormLabel>Button Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="slides" title="Slide" control={form.control} defaultItem={{ title: '', subtitle: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`slides.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`slides.${index}.subtitle`} render={({ field }) => ( <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`slides.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Hero Section
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function WhyUsForm({ initialData }: { initialData: WebsiteContent['whyUsSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof whyUsSectionSchema>>({
        resolver: zodResolver(whyUsSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof whyUsSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('whyUsSection', data);
            if (result.success) toast({ title: "Success", description: "Why Us Section updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };
    
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="points" title="Point" control={form.control} defaultItem={{ icon: 'BookOpen', title: '', description: '', imageUrl: '' }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`points.${index}.icon`} render={({ field }) => ( <FormItem><FormLabel>Icon Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`points.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`points.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`points.${index}.imageUrl`} label="Image URL"/>
                    </>
                )}/>
                 <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Why Us Section
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function SignatureProgramsForm({ initialData }: { initialData: WebsiteContent['signatureProgramsSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof signatureProgramsSectionSchema>>({
        resolver: zodResolver(signatureProgramsSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof signatureProgramsSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('signatureProgramsSection', data);
            if (result.success) toast({ title: "Success", description: "Signature Programs section updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };
    
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="programs" title="Program" control={form.control} defaultItem={{ title: '', description: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`programs.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`programs.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Signature Programs
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function AdministrationSectionForm({ initialData }: { initialData: WebsiteContent['administrationSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof administrationSectionSchema>>({
        resolver: zodResolver(administrationSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof administrationSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('administrationSection', data);
            if (result.success) toast({ title: "Success", description: "Administration section updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="administrators" title="Administrator" control={control} defaultItem={{ name: '', title: '', imageUrl: '' }} renderItem={(index) => (
                    <>
                        <FormField control={control} name={`administrators.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={control} name={`administrators.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`administrators.${index}.imageUrl`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Administration Section
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function NewsForm({ initialData }: { initialData: WebsiteContent['newsSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof newsSectionSchema>>({
        resolver: zodResolver(newsSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;
    
    const onSubmit = (data: z.infer<typeof newsSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('newsSection', data);
            if (result.success) toast({ title: "Success", description: "News section updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="posts" title="Post" control={form.control} defaultItem={{ title: '', date: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`posts.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`posts.${index}.date`} render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`posts.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save News Section
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function AlumniSpotlightForm({ initialData }: { initialData: WebsiteContent['alumniSpotlightSection'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof alumniSpotlightSectionSchema>>({
        resolver: zodResolver(alumniSpotlightSectionSchema),
        defaultValues: initialData,
    });
    const { control } = form;
    
    const onSubmit = (data: z.infer<typeof alumniSpotlightSectionSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('alumniSpotlightSection', data);
            if (result.success) toast({ title: "Success", description: "Alumni Spotlight section updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="heading" render={({ field }) => ( <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="spotlights" title="Spotlight" control={form.control} defaultItem={{ name: '', graduationYear: '', quote: '', imageUrl: '' }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`spotlights.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Alum Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`spotlights.${index}.graduationYear`} render={({ field }) => ( <FormItem><FormLabel>Graduation Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`spotlights.${index}.quote`} render={({ field }) => ( <FormItem><FormLabel>Quote</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`spotlights.${index}.imageUrl`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Alumni Spotlight
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function AcademicsPageForm({ initialData }: { initialData: WebsiteContent['academicsPage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof academicsPageSchema>>({
        resolver: zodResolver(academicsPageSchema),
        defaultValues: initialData,
    });
    const { control } = form;
    
    const onSubmit = (data: z.infer<typeof academicsPageSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('academicsPage', data);
            if (result.success) toast({ title: "Success", description: "Academics page updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="programs" title="Program" control={form.control} defaultItem={{ name: '', description: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`programs.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`programs.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`programs.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Academics Page
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function AdmissionsPageForm({ initialData }: { initialData: WebsiteContent['admissionsPage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof admissionsPageSchema>>({
        resolver: zodResolver(admissionsPageSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof admissionsPageSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('admissionsPage', data);
            if (result.success) toast({ title: "Success", description: "Admissions page updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="formUrl" render={({ field }) => ( <FormItem><FormLabel>Apply Form URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="process" title="Step" control={form.control} defaultItem={{ step: '', title: '', description: '' }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`process.${index}.step`} render={({ field }) => ( <FormItem><FormLabel>Step Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`process.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`process.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Admissions Page
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function StudentLifePageForm({ initialData }: { initialData: WebsiteContent['studentLifePage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof studentLifePageSchema>>({
        resolver: zodResolver(studentLifePageSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof studentLifePageSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('studentLifePage', data);
            if (result.success) toast({ title: "Success", description: "Student Life page updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ArrayEditor name="features" title="Feature" control={form.control} defaultItem={{ title: '', description: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`features.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`features.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`features.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Student Life Page
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function HousesPageForm({ initialData }: { initialData: WebsiteContent['housesPage'] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const form = useForm<z.infer<typeof housesPageSchema>>({
        resolver: zodResolver(housesPageSchema),
        defaultValues: initialData,
    });
    const { control } = form;

    const onSubmit = (data: z.infer<typeof housesPageSchema>) => {
        startTransition(async () => {
            const result = await updateWebsiteSection('housesPage', data);
            if (result.success) toast({ title: "Success", description: "Houses Page content updated." });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <ImageUploadInput fieldName="heroImageUrl" label="Hero Image URL"/>
                <ArrayEditor name="houses" title="House" control={form.control} defaultItem={{ name: '', description: '', imageUrls: [''] }} renderItem={(index) => (
                    <>
                        <FormField control={form.control} name={`houses.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`houses.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <ImageUploadInput fieldName={`houses.${index}.imageUrls.0`} label="Image URL"/>
                    </>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Houses Page
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

export function WebsiteContentForm({ initialData }: { initialData: WebsiteContent }) {
    const simplePageForms = [
        {key: 'alumniPage', title: 'Pages: Alumni'},
        {key: 'campusPage', title: 'Pages: Campus'},
        {key: 'clubsPage', title: 'Pages: Clubs & Organizations'},
        {key: 'collegeCounselingPage', title: 'Pages: College Counseling'},
        {key: 'employmentPage', title: 'Pages: Employment'},
        {key: 'facultyPage', title: 'Pages: Faculty'},
        {key: 'historyPage', title: 'Pages: History'},
        {key: 'parentsPage', title: 'Pages: Parent Association'},
        {key: 'tuitionPage', title: 'Pages: Tuition & Fees'},
        {key: 'visitPage', title: 'Pages: Visit Us'},
    ];

    return (
        <Accordion type="multiple" defaultValue={["item-general"]} className="w-full space-y-4">
            <AccordionItem value="item-general" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>General Settings</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><LogoForm initialData={initialData.logoUrl} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-hero-slideshow" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Hero Slideshow</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><HeroSlideshowForm initialData={initialData.heroSlideshowSection} /></AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-whyus" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Why Us</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><WhyUsForm initialData={initialData.whyUsSection} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-sigprog" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Signature Programs</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><SignatureProgramsForm initialData={initialData.signatureProgramsSection} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-administration" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Our Administration</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AdministrationSectionForm initialData={initialData.administrationSection} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-alumni" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: Alumni Spotlight</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AlumniSpotlightForm initialData={initialData.alumniSpotlightSection} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-news" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Homepage: News Section</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><NewsForm initialData={initialData.newsSection} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-academics" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Academics</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AcademicsPageForm initialData={initialData.academicsPage} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-admissions" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Admissions</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><AdmissionsPageForm initialData={initialData.admissionsPage} /></AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-studentlife" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Student Life</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><StudentLifePageForm initialData={initialData.studentLifePage} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-houses" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Houses</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><HousesPageForm initialData={initialData.housesPage} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-contact" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Contact</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0"><ContactPageForm initialData={initialData.contactPage} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-mission" className="border rounded-lg bg-card">
                <AccordionTrigger className="p-4 hover:no-underline"><CardTitle>Pages: Mission & Vision</CardTitle></AccordionTrigger>
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
