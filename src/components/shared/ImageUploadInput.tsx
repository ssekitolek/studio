
"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

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
        // Use local state to control the input for a responsive typing experience
        const [localValue, setLocalValue] = useState(field.value || '');
        const [showConfirmation, setShowConfirmation] = useState(false);

        // Effect to sync local state if the form value changes externally (e.g., on initial load)
        useEffect(() => {
          if (field.value !== localValue) {
            setLocalValue(field.value || '');
          }
          // Intentionally not depending on localValue to avoid loops
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [field.value]);

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
          field.onBlur(); // Propagate the original onBlur event for form validation state
          // Only update the main form state if the value has actually changed
          if (field.value !== e.target.value) {
            field.onChange(e.target.value); // This updates the React Hook Form state
            if (e.target.value) {
              setShowConfirmation(true);
              const timer = setTimeout(() => setShowConfirmation(false), 2500);
              // No cleanup needed as it's a one-shot timer on blur
            }
          }
        };
        
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-4">
              {field.value ? ( // The preview image is based on the stable form value
                <Image
                  key={field.value} // Force re-render if the stable form value changes
                  src={field.value}
                  alt={label}
                  width={100}
                  height={60}
                  className="rounded-md object-cover aspect-video bg-muted"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-[100px] h-[60px] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                  No Image
                </div>
              )}
              <div className="flex-grow">
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="https://i.imgur.com/your-image.png"
                      value={localValue}
                      onChange={(e) => setLocalValue(e.target.value)} // Update local state on every key press
                      onBlur={handleBlur} // Update global form state on blur
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <div className="text-xs text-muted-foreground mt-1 h-4">
                  {showConfirmation ? (
                    <span className="flex items-center text-green-600 transition-opacity duration-300 ease-in-out opacity-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Link updated. Save all changes below.
                    </span>
                  ) : (
                    <span className="transition-opacity duration-300 ease-in-out opacity-100">
                       Paste URL & click away to update preview.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
