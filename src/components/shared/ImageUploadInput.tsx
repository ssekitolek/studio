
"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import Image from 'next/image';
import { isValidUrl } from "@/lib/utils";

interface ImageUploadInputProps {
  fieldName: string;
  label: string;
}

export function ImageUploadInput({ fieldName, label }: ImageUploadInputProps) {
  const { control } = useFormContext();
  
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => {
        // Directly use the field's value from react-hook-form.
        // This is the most reliable way and prevents state-sync bugs.
        const imageUrl = isValidUrl(field.value) ? field.value : null;

        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>{label}</Label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <Image
                  key={imageUrl} // Use the URL as a key to force re-render on change
                  src={imageUrl}
                  alt={label}
                  width={100}
                  height={60}
                  className="rounded-md object-cover aspect-video bg-muted border"
                  // next/image's loader will handle errors gracefully
                />
              ) : (
                <div className="w-[100px] h-[60px] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center border">
                  No/Invalid Image URL
                </div>
              )}
              <div className="flex-grow">
                <FormItem>
                  <FormControl>
                    {/*
                      This input is now fully controlled by react-hook-form.
                      Every keystroke updates the central form state, eliminating
                      the bug where input would disappear on re-renders.
                    */}
                    <Input
                      id={field.name}
                      placeholder="https://i.imgur.com/your-image.png"
                      {...field}
                      value={field.value || ''} // Ensure input is always a controlled component
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
