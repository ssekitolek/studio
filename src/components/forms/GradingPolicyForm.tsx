
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createGradingPolicy, updateGradingPolicy } from "@/lib/actions/dos-actions";
import type { GradingPolicy, GradingScaleItem } from "@/lib/types";
import { Loader2, Save, PlusCircle, Trash2, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";

const gradingScaleItemSchema = z.object({
  grade: z.string().min(1, "Grade symbol is required."),
  minScore: z.coerce.number().min(0, "Min score must be >= 0.").max(100, "Min score must be <= 100."),
  maxScore: z.coerce.number().min(0, "Max score must be >= 0.").max(100, "Max score must be <= 100."),
}).refine(data => data.minScore <= data.maxScore, {
  message: "Min score cannot be greater than max score.",
  path: ["minScore"], // Or path: ["maxScore"]
});

const gradingPolicyFormSchema = z.object({
  name: z.string().min(3, "Policy name must be at least 3 characters."),
  scale: z.array(gradingScaleItemSchema).min(1, "At least one grade tier is required."),
  isDefault: z.boolean().optional(),
});

type GradingPolicyFormValues = z.infer<typeof gradingPolicyFormSchema>;

interface GradingPolicyFormProps {
  initialData?: GradingPolicy | null;
  policyId?: string;
  onSuccess?: () => void;
}

export function GradingPolicyForm({ initialData, policyId, onSuccess }: GradingPolicyFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const isEditMode = !!policyId && !!initialData;

  const form = useForm<GradingPolicyFormValues>({
    resolver: zodResolver(gradingPolicyFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      scale: initialData?.scale && initialData.scale.length > 0 ? initialData.scale : [{ grade: "", minScore: 0, maxScore: 0 }],
      isDefault: initialData?.isDefault || false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "scale",
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        scale: initialData.scale.length > 0 ? initialData.scale : [{ grade: "", minScore: 0, maxScore: 0 }],
        isDefault: initialData.isDefault || false,
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: GradingPolicyFormValues) => {
    startTransition(async () => {
      try {
        if (isEditMode && policyId) {
          const result = await updateGradingPolicy(policyId, data as Omit<GradingPolicy, 'id'>);
          if (result.success) {
            toast({ title: "Grading Policy Updated", description: `Policy "${data.name}" updated successfully.` });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");
          } else {
            toast({ title: "Error Updating Policy", description: result.message || "Failed to update policy.", variant: "destructive" });
          }
        } else {
          const result = await createGradingPolicy(data as Omit<GradingPolicy, 'id'>);
          if (result.success && result.policy) {
            toast({ title: "Grading Policy Created", description: `Policy "${result.policy.name}" created successfully.` });
            form.reset({ name: "", scale: [{ grade: "", minScore: 0, maxScore: 0 }], isDefault: false });
            if (onSuccess) onSuccess(); else router.push("/dos/settings/exams");
          } else {
            toast({ title: "Error Creating Policy", description: result.message || "Failed to create policy.", variant: "destructive" });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ title: "Submission Error", description: errorMessage, variant: "destructive" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Standard High School Scale, University Pass/Fail" {...field} />
              </FormControl>
              <FormDescription>A descriptive name for this grading policy.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="text-base">Grade Tiers</FormLabel>
          <FormDescription className="mb-4">Define the grades and their corresponding score ranges.</FormDescription>
          {fields.map((item, index) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-md mb-4">
              <FormField
                control={form.control}
                name={`scale.${index}.grade`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl><Input placeholder="e.g., A+" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`scale.${index}.minScore`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Score (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 90" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`scale.${index}.maxScore`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Score (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => remove(index)}
                className="w-full md:w-auto"
                disabled={fields.length <= 1}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ grade: "", minScore: 0, maxScore: 0 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Grade Tier
          </Button>
        </div>
        
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Set as Default Policy
                </FormLabel>
                <FormDescription>
                  If checked, this policy will be used as the default across the system.
                  Note: General settings might override this if a global default is explicitly set there.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
               <Edit3 className="mr-2 h-4 w-4" />
            ): (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Policy" : "Save Policy"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
