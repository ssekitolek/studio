
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const websiteContentSchema = z.object({
  hero: z.object({
    title: z.string().min(1, "Hero title is required."),
    subtitle: z.string().min(1, "Hero subtitle is required."),
  }),
  features: z.array(z.object({
    title: z.string().min(1, "Feature title is required."),
    description: z.string().min(1, "Feature description is required."),
  })).length(3, "There must be exactly 3 features."),
  academics: z.object({
    title: z.string().min(1, "Academics title is required."),
    description: z.string().min(1, "Academics description is required."),
    imageUrl: z.string().url("Must be a valid URL."),
  }),
  news: z.array(z.object({
    title: z.string().min(1, "News title is required."),
    date: z.string().min(1, "News date is required."),
    description: z.string().min(1, "News description is required."),
    imageUrl: z.string().url("Must be a valid URL."),
  })).length(3, "There must be exactly 3 news items."),
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

  const { fields: featureFields } = useFieldArray({ control: form.control, name: "features" });
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
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>The main section at the top of the homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hero.title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hero.subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtitle</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features Section</CardTitle>
            <CardDescription>The three "Why Choose Us?" cards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                <h4 className="font-semibold">Feature {index + 1}</h4>
                <FormField
                  control={form.control}
                  name={`features.${index}.title`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`features.${index}.description`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Academics Section</CardTitle>
            <CardDescription>The section with the "World-Class Academic Program" title.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="academics.title"
              render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="academics.description"
              render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="academics.imageUrl"
              render={({ field }) => (
                <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>News & Events Section</CardTitle>
            <CardDescription>The three news cards at the bottom of the page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {newsFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                <h4 className="font-semibold">News Item {index + 1}</h4>
                <FormField
                  control={form.control}
                  name={`news.${index}.title`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`news.${index}.date`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`news.${index}.description`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`news.${index}.imageUrl`}
                  render={({ field }) => (
                    <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
              </div>
            ))}
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
