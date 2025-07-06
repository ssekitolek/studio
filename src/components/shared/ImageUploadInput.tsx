
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
        const isUrlValidForPreview = isValidUrl(field.value);

        return (
          <div className="space-y-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <div className="flex items-center gap-4">
              {isUrlValidForPreview ? (
                <Image
                  key={field.value} // Use key to force re-render on URL change
                  src={field.value}
                  alt={label}
                  width={100}
                  height={60}
                  className="rounded-md object-cover aspect-video bg-muted border"
                  onError={(e) => {
                    // In case of an error loading the image (e.g., 404), hide the element
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-[100px] h-[60px] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center border">
                  No valid image
                </div>
              )}
              <div className="flex-grow">
                <FormItem>
                  <FormControl>
                    <Input
                      id={fieldName}
                      placeholder="https://i.imgur.com/your-image.png"
                      {...field}
                      value={field.value || ''}
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
