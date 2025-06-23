
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadWebsiteMedia, deleteWebsiteMedia } from "@/lib/actions/website-actions";
import { Loader2, UploadCloud, Trash2 } from "lucide-react";

interface ImageUploadInputProps {
  fieldName: string;
  label: string;
}

export function ImageUploadInput({ fieldName, label }: ImageUploadInputProps) {
  const { toast } = useToast();
  const { watch, setValue, getValues } = useFormContext();
  const imageUrl = watch(fieldName);

  const [isUploading, startUploadingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    
    const oldUrl = getValues(fieldName);
    if (oldUrl) {
      formData.append("oldFileUrl", oldUrl);
    }

    startUploadingTransition(async () => {
      const result = await uploadWebsiteMedia(formData);
      if (result.success && result.url) {
        setValue(fieldName, result.url, { shouldDirty: true });
        toast({ title: "Success", description: "Media uploaded successfully." });
      } else {
        toast({
          title: "Upload Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };
  
  const handleRemoveImage = () => {
      const urlToRemove = getValues(fieldName);
      if (!urlToRemove || urlToRemove.includes("placehold.co")) return;

      startDeletingTransition(async () => {
        const result = await deleteWebsiteMedia(urlToRemove);
        if (result.success) {
            setValue(fieldName, "https://placehold.co/600x400.png", { shouldDirty: true });
            toast({ title: "Image Removed", description: "Image has been removed from storage." });
        } else {
            toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
        }
      });
  }

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
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <label htmlFor={fieldName} className="cursor-pointer">
                {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
                {isUploading ? "Uploading..." : "Change"}
              </label>
            </Button>
            <Input
              id={fieldName}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={isUploading || isDeleting}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemoveImage}
              disabled={isUploading || isDeleting || !imageUrl || imageUrl.includes('placehold.co')}
            >
              {isDeleting ? <Loader2 className="animate-spin"/> : <Trash2 />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Current: {imageUrl}</p>
        </div>
      </div>
    </div>
  );
}
