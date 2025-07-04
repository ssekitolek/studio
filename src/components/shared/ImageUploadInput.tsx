
"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

interface ImageUploadInputProps {
  fieldName: string;
  label: string;
}

export function ImageUploadInput({ fieldName, label }: ImageUploadInputProps) {
  const { control, watch } = useFormContext();
  const imageUrl = watch(fieldName);
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip the effect on the initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Show confirmation when the imageUrl changes after the initial render
    if (imageUrl) {
      setShowConfirmation(true);
      const timer = setTimeout(() => {
        setShowConfirmation(false);
      }, 2500); // Show confirmation for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [imageUrl]);


  return (
    <div className="space-y-2">
       <Label>{label}</Label>
        <div className="flex items-center gap-4">
            {imageUrl ? (
              <Image
                  key={imageUrl} // Use key to force re-render on URL change
                  src={imageUrl}
                  alt={label}
                  width={100}
                  height={60}
                  className="rounded-md object-cover aspect-video bg-muted"
                  onError={(e) => {
                    // This will hide the native broken image icon if the URL is invalid.
                    // The `alt` text might still be shown by the browser.
                    e.currentTarget.style.display = 'none';
                  }}
              />
            ) : (
              <div className="w-[100px] h-[60px] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                  No Image
              </div>
            )}
            <div className="flex-grow">
                 <FormField
                    control={control}
                    name={fieldName}
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <Input
                            placeholder="https://i.imgur.com/your-image.png"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="text-xs text-muted-foreground mt-1 h-4">
                    {showConfirmation ? (
                        <span className="flex items-center text-green-600 transition-opacity duration-300 ease-in-out opacity-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Link received. Save all changes below.
                        </span>
                    ) : (
                        <span className="transition-opacity duration-300 ease-in-out opacity-100">
                           Paste the direct image URL.
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
