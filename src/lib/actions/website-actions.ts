
'use server';

import { db, storage } from "@/lib/firebase";
import type { WebsiteContent } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";

const defaultContent: WebsiteContent = {
  logoUrl: "https://placehold.co/100x100.png",
  hero: {
    title: "Nurturing Minds, Building Futures",
    subtitle: "At St. Mbaaga's College Naddangira, we are dedicated to providing a transformative education that inspires students to achieve their full potential.",
  },
  features: [
    { title: "Excellence in Education", description: "Our rigorous academic curriculum is designed to challenge students and foster a love for lifelong learning." },
    { title: "Holistic Development", description: "We focus on developing the whole person through a rich program of arts, sports, and community service." },
    { title: "Vibrant Community", description: "A supportive and inclusive environment where every student feels valued, respected, and empowered to succeed." }
  ],
  academics: {
    title: "A World-Class Academic Program",
    description: "From science and technology to arts and humanities, our programs are designed to inspire curiosity and prepare students for the challenges of tomorrow.",
    imageUrl: "https://placehold.co/600x400.png"
  },
  news: [
    { title: "Annual Science Fair Winners Announced", date: "June 20, 2025", description: "Congratulations to our brilliant young scientists who showcased incredible projects this year.", imageUrl: "https://placehold.co/600x400.png" },
    { title: "Sports Day Championship Highlights", date: "June 15, 2025", description: "A day of thrilling competition and great sportsmanship. See the results and photo gallery.", imageUrl: "https://placehold.co/600x400.png" },
    { title: "Community Service Drive a Huge Success", date: "June 10, 2025", description: "Our students volunteered over 500 hours to support local charities and community projects.", imageUrl: "https://placehold.co/600x400.png" }
  ]
};

export async function getWebsiteContent(): Promise<WebsiteContent> {
  if (!db) {
    console.error("Firestore not initialized. Returning default website content.");
    return defaultContent;
  }
  try {
    const contentRef = doc(db, "website_content", "homepage");
    const contentSnap = await getDoc(contentRef);
    if (contentSnap.exists()) {
      const data = contentSnap.data() as Partial<WebsiteContent>;
      // Merge with defaults to ensure all fields are present, especially new ones like logoUrl
      return { ...defaultContent, ...data };
    } else {
      // If the document doesn't exist, create it with default content
      await setDoc(contentRef, defaultContent);
      return defaultContent;
    }
  } catch (error) {
    console.error("Error fetching website content:", error);
    return defaultContent; // Return default content on error
  }
}

export async function updateWebsiteContent(content: WebsiteContent): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore not initialized." };
  }
  try {
    const contentRef = doc(db, "website_content", "homepage");
    await setDoc(contentRef, content, { merge: true });
    revalidatePath("/");
    revalidatePath("/admin/dashboard");
    return { success: true, message: "Website content updated successfully." };
  } catch (error) {
    console.error("Error updating website content:", error);
    return { success: false, message: `Failed to update content: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function uploadWebsiteMedia(
  formData: FormData
): Promise<{ success: boolean; message: string; url?: string }> {
  if (!storage) {
    return { success: false, message: "Firebase Storage is not initialized." };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, message: "No file provided." };
  }

  const oldFileUrl = formData.get("oldFileUrl") as string | null;

  // Generate a unique file name
  const fileName = `website-media/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, fileName);

  try {
    // Upload the new file
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    // If there was an old file, try to delete it
    if (oldFileUrl && oldFileUrl.includes("firebasestorage.googleapis.com")) {
      try {
        const oldFileRef = ref(storage, oldFileUrl);
        await deleteObject(oldFileRef);
      } catch (deleteError: any) {
        // If the old file doesn't exist, it's not a critical error.
        if (deleteError.code !== 'storage/object-not-found') {
          console.warn("Could not delete old file:", deleteError);
          // Don't fail the whole upload, just warn.
        }
      }
    }

    return { success: true, message: "File uploaded successfully.", url: downloadURL };
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Upload failed: ${errorMessage}` };
  }
}


export async function deleteWebsiteMedia(fileUrl: string): Promise<{ success: boolean; message: string }> {
  if (!storage) {
    return { success: false, message: "Firebase Storage is not initialized." };
  }
  if (!fileUrl || !fileUrl.includes("firebasestorage.googleapis.com")) {
    return { success: true, message: "Placeholder image has no file to delete." };
  }
  
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    return { success: true, message: "File deleted successfully." };
  } catch (error: any) {
     if (error.code !== 'storage/object-not-found') {
        console.error("Could not delete file:", error);
        return { success: false, message: `Failed to delete file: ${error.message}` };
    }
    // If file not found, it's a success from the user's perspective.
    return { success: true, message: "File already removed from storage." };
  }
}
