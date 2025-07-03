
'use server';

import { db } from "@/lib/firebase";
import type { WebsiteContent } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const defaultContent: WebsiteContent = {
  logoUrl: "https://placehold.co/100x100.png",
  hero: {
    title: "Discover Your Voice. Shape Your Future.",
    subtitle: "At St. Mbaaga's College, we provide an inspiring and challenging education that empowers students to achieve their full potential and make a difference in the world.",
    imageUrl: "https://placehold.co/1920x1080.png",
  },
  atAGlance: [
    { label: "Founded", value: "1965" },
    { label: "Student-Faculty Ratio", value: "12:1" },
    { label: "Enrollment", value: "850" },
    { label: "Clubs & Activities", value: "30+" },
  ],
  programHighlights: [
    { 
      title: "Academics", 
      description: "A rigorous, inquiry-based curriculum that fosters critical thinking and a passion for lifelong learning.",
      imageUrl: "https://placehold.co/600x400.png"
    },
    { 
      title: "Arts", 
      description: "A vibrant arts program that encourages creativity, self-expression, and collaboration across various disciplines.",
      imageUrl: "https://placehold.co/600x400.png"
    },
    { 
      title: "Athletics", 
      description: "Competitive sports programs that build character, teamwork, and a commitment to personal excellence.",
      imageUrl: "https://placehold.co/600x400.png"
    }
  ],
  community: {
    title: "A Community of Belonging",
    description: "We are a diverse and inclusive community where every student is known, valued, and supported. Our students build lifelong friendships and a strong sense of social responsibility.",
    imageUrl: "https://placehold.co/600x400.png"
  },
  news: [
    { title: "Annual Science Fair Winners Announced", date: "June 20, 2025", description: "Congratulations to our brilliant young scientists who showcased incredible projects this year.", imageUrl: "https://placehold.co/600x400.png" },
    { title: "Sports Day Championship Highlights", date: "June 15, 2025", description: "A day of thrilling competition and great sportsmanship. See the results and photo gallery.", imageUrl: "https://placehold.co/600x400.png" },
    { title: "Community Service Drive a Huge Success", date: "June 10, 2025", description: "Our students volunteered over 500 hours to support local charities and community projects.", imageUrl: "https://placehold.co/600x400.png" }
  ],
  callToAction: {
    title: "Ready to Join Our Community?",
    description: "We invite you to learn more about the admissions process and discover if St. Mbaaga's College is the right fit for your family.",
    buttonText: "Inquire Now",
    buttonLink: "#"
  }
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
      // Merge with defaults to ensure all fields are present
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
