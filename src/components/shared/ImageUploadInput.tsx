
"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import Image from 'next/image';
import { isValidUrl } from "@/lib/utils";
import { useState, useEffect } from 'react';

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
        // Use local state for the input value to prevent it from being wiped during parent re-renders.
        // This is the core fix. The input is controlled by its own state while typing.
        const [inputValue, setInputValue] = useState(field.value || '');

        // Effect to sync local state if the form's value is changed externally (e.g., by a reset).
        useEffect(() => {
          if (field.value !== inputValue) {
            setInputValue(field.value || '');
          }
        }, [field.value]);

        const handleBlur = () => {
          // When the user is done editing, update the main form state.
          // This commits the value to react-hook-form.
          field.onChange(inputValue);
        };
        
        // The preview image is based on the committed form value, not the live input value.
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
                    e.currentTarget.style.display = 'none';
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
                      value={inputValue} // Controlled by local state
                      onChange={(e) => setInputValue(e.target.value)} // Update local state on each keystroke
                      onBlur={handleBlur} // Update main form state on blur
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
