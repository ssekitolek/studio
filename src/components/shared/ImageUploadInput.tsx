
"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import Image from 'next/image';

interface ImageUploadInputProps {
  fieldName: string;
  label: string;
}

export function ImageUploadInput({ fieldName, label }: ImageUploadInputProps) {
  const { control, watch } = useFormContext();
  const imageUrl = watch(fieldName);

  return (
    <div className="space-y-2">
       <Label>{label}</Label>
        <div className="flex items-center gap-4">
            {imageUrl ? (
            <Image
                src={imageUrl}
                alt={label}
                width={100}
                height={60}
                className="rounded-md object-cover aspect-video bg-muted"
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
                 <p className="text-xs text-muted-foreground mt-1">
                    Paste the direct image URL (e.g., from Imgur).
                </p>
            </div>
        </div>
    </div>
  );
}
