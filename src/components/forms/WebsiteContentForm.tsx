
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Logo and Hero Section */}
        <Card>
          <CardHeader><CardTitle>Header & Hero Section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem> <FormLabel>Logo Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="hero.title" render={({ field }) => ( <FormItem> <FormLabel>Hero Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="hero.subtitle" render={({ field }) => ( <FormItem> <FormLabel>Hero Subtitle</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="hero.imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Hero Background Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
          </CardContent>
        </Card>

        {/* At a Glance Section */}
        <Card>
          <CardHeader>
            <CardTitle>At a Glance Section</CardTitle>
            <CardDescription>Key statistics shown below the hero section.</CardDescription>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>Program Highlights Section</CardTitle>
            <CardDescription>The three main program cards (e.g., Academics, Arts, Athletics).</CardDescription>
          </CardHeader>
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
          <CardHeader><CardTitle>Community Section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="community.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="community.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="community.imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
          </CardContent>
        </Card>
        
        {/* News Section */}
        <Card>
          <CardHeader>
            <CardTitle>News & Events Section</CardTitle>
            <CardDescription>The three news cards.</CardDescription>
          </CardHeader>
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
          <CardHeader><CardTitle>Call to Action Section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="callToAction.title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="callToAction.description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="callToAction.buttonText" render={({ field }) => ( <FormItem> <FormLabel>Button Text</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="callToAction.buttonLink" render={({ field }) => ( <FormItem> <FormLabel>Button Link</FormLabel> <FormControl><Input placeholder="#" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
          </CardContent>
        </Card>

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
