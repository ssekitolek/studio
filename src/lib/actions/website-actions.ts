
'use server';

import { db } from "@/lib/firebase";
import type { WebsiteContent } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const defaultContent: WebsiteContent = {
  logoUrl: "https://placehold.co/100x100.png",
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
  inquireSection: {
    buttonText: "Inquire Now",
    buttonLink: "/admissions",
    slides: [
      {
        title: "Discover Your Voice. Shape Your Future.",
        subtitle: "At St. Mbaaga's College, we provide an inspiring and challenging education that empowers students to achieve their full potential and make a difference in the world.",
        imageUrl: "https://placehold.co/1920x1080.png",
      },
      {
        title: "Explore Our Campus",
        subtitle: "Schedule a visit to see our vibrant community and state-of-the-art facilities in person.",
        imageUrl: "https://placehold.co/1920x1080.png",
      },
      {
        title: "A Tradition of Excellence",
        subtitle: "For over 50 years, we have been dedicated to nurturing the next generation of leaders and innovators.",
        imageUrl: "https://placehold.co/1920x1080.png",
      },
    ]
  },
  academicsPage: {
    title: "Our Academic Programs",
    description: "We offer a comprehensive curriculum designed to challenge and inspire students at every level.",
    programs: [
      { name: "Lower School", description: "Fostering curiosity and a love for learning in a nurturing environment.", imageUrl: "https://placehold.co/600x400.png" },
      { name: "Middle School", description: "Developing critical thinking, collaboration, and independence.", imageUrl: "https://placehold.co/600x400.png" },
      { name: "Upper School", description: "Preparing students for success in college and beyond with advanced coursework and leadership opportunities.", imageUrl: "https://placehold.co/600x400.png" },
    ],
  },
  admissionsPage: {
    title: "Admissions Process",
    description: "We welcome you to learn more about joining the St. Mbaaga's College community. Our admissions process is designed to be thorough and thoughtful.",
    process: [
      { step: "01", title: "Inquire & Visit", description: "Submit an online inquiry form and schedule a campus tour to experience our community firsthand." },
      { step: "02", title: "Apply Online", description: "Complete the online application and submit all required documents, including transcripts and recommendations." },
      { step: "03", title: "Interview", description: "Applicant and parent interviews are a key part of our process to get to know you better." },
      { step: "04", title: "Admission Decision", description: "Admission decisions are sent out in early March. We look forward to welcoming new families to our school." },
    ],
    formUrl: "#",
  },
  contactPage: {
    title: "Get in Touch",
    address: "St. Mbaaga's College, Naddangira, Uganda",
    phone: "+256 123 456789",
    email: "info@st-mbaaga.test",
    mapImageUrl: "https://placehold.co/1200x400.png",
  },
  studentLifePage: {
    title: "Vibrant Student Life",
    description: "Our community is built on a foundation of diverse interests, shared passions, and a commitment to making a positive impact. Discover the activities that make life at St. Mbaaga's so enriching.",
    features: [
      {
        title: "Athletics",
        description: "From the pitch to the court, our athletics program fosters teamwork, resilience, and sportsmanship.",
        imageUrl: "https://placehold.co/600x400.png"
      },
      {
        title: "Arts & Music",
        description: "Explore your creativity in our state-of-the-art studios and performance spaces. Join the band, choir, or drama club.",
        imageUrl: "https://placehold.co/600x400.png"
      },
      {
        title: "Clubs & Organizations",
        description: "With over 30 student-led clubs, there's something for everyone. Develop new skills and pursue your passions.",
        imageUrl: "https://placehold.co/600x400.png"
      },
      {
        title: "Community Service",
        description: "We believe in giving back. Our students actively engage in service projects that make a real difference in our community.",
        imageUrl: "https://placehold.co/600x400.png"
      },
    ]
  },
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
      // Deep merge for nested objects
      return {
        ...defaultContent,
        ...data,
        atAGlance: data.atAGlance || defaultContent.atAGlance,
        programHighlights: data.programHighlights || defaultContent.programHighlights,
        community: { ...defaultContent.community, ...data.community },
        news: data.news || defaultContent.news,
        inquireSection: { 
          ...defaultContent.inquireSection, 
          ...(data.inquireSection || {}),
          slides: data.inquireSection?.slides || defaultContent.inquireSection.slides,
        },
        academicsPage: { ...defaultContent.academicsPage, ...data.academicsPage },
        admissionsPage: { ...defaultContent.admissionsPage, ...data.admissionsPage },
        contactPage: { ...defaultContent.contactPage, ...data.contactPage },
        studentLifePage: { ...defaultContent.studentLifePage, ...data.studentLifePage },
      };
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
    revalidatePath("/academics");
    revalidatePath("/admissions");
    revalidatePath("/contact");
    revalidatePath("/mission-vision");
    revalidatePath("/student-life");
    return { success: true, message: "Website content updated successfully." };
  } catch (error) {
    console.error("Error updating website content:", error);
    return { success: false, message: `Failed to update content: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
