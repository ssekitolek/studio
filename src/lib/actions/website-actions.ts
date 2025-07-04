
'use server';

import { db } from "@/lib/firebase";
import type { WebsiteContent } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const defaultContent: WebsiteContent = {
  logoUrl: "https://placehold.co/120x40.png",
  heroSection: {
    heading: "A New Era of Learning Has Begun",
    subheading: "At St. Mbaaga's, we foster a vibrant community where intellectual curiosity and personal growth are at the heart of everything we do.",
    imageUrl: "https://placehold.co/1920x1080.png",
    primaryCtaText: "Inquire Now",
    primaryCtaLink: "/contact",
    secondaryCtaText: "Explore Academics",
    secondaryCtaLink: "/academics"
  },
  whyUsSection: {
    heading: "Why St. Mbaaga's College?",
    description: "We are more than just a school; we are a community dedicated to empowering students to lead lives of purpose and impact.",
    points: [
      {
        icon: "BookOpen",
        title: "Rigorous Academics",
        description: "Our curriculum challenges students to think critically, collaborate effectively, and solve complex problems."
      },
      {
        icon: "Users",
        title: "Inclusive Community",
        description: "We celebrate diversity and foster a sense of belonging where every student feels known, valued, and supported."
      },
      {
        icon: "Trophy",
        title: "Signature Programs",
        description: "From STEM to the arts, our specialized programs provide students with opportunities to explore their passions."
      }
    ]
  },
  connectWithUsSection: {
    heading: "Connect With Us",
    inquireText: "Inquire",
    inquireLink: "/contact",
    applyText: "Apply",
    applyLink: "/admissions"
  },
  signatureProgramsSection: {
    heading: "Signature Programs",
    programs: [
      { title: "STEM & Innovation", description: "Engage in hands-on learning and research in our state-of-the-art labs.", imageUrl: "https://placehold.co/600x400.png" },
      { title: "Global Studies", description: "Develop a global perspective through immersive cultural experiences and language studies.", imageUrl: "https://placehold.co/600x400.png" },
      { title: "Arts & Humanities", description: "Cultivate your creativity and find your voice in our comprehensive arts and humanities programs.", imageUrl: "https://placehold.co/600x400.png" }
    ]
  },
  newsSection: {
    heading: "What's Happening",
    posts: [
      { title: "Annual Science Fair Winners Announced", date: "June 20, 2025", imageUrl: "https://placehold.co/600x400.png" },
      { title: "Sports Day Championship Highlights", date: "June 15, 2025", imageUrl: "https://placehold.co/600x400.png" },
      { title: "Community Service Drive a Huge Success", date: "June 10, 2025", imageUrl: "https://placehold.co/600x400.png" }
    ]
  },
  academicsPage: {
    title: "Our Academic Programs",
    description: "We offer a comprehensive curriculum designed to challenge and inspire students at every level.",
    programs: [
      { name: "Lower School", description: "Fostering curiosity and a love for learning in a nurturing environment.", imageUrls: ["https://placehold.co/600x400.png"] },
      { name: "Middle School", description: "Developing critical thinking, collaboration, and independence.", imageUrls: ["https://placehold.co/600x400.png"] },
      { name: "Upper School", description: "Preparing students for success in college and beyond with advanced coursework and leadership opportunities.", imageUrls: ["https://placehold.co/600x400.png"] },
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
        imageUrls: ["https://placehold.co/600x400.png"]
      },
      {
        title: "Arts & Music",
        description: "Explore your creativity in our state-of-the-art studios and performance spaces. Join the band, choir, or drama club.",
        imageUrls: ["https://placehold.co/600x400.png"]
      },
      {
        title: "Clubs & Organizations",
        description: "With over 30 student-led clubs, there's something for everyone. Develop new skills and pursue your passions.",
        imageUrls: ["https://placehold.co/600x400.png"]
      },
      {
        title: "Community Service",
        description: "We believe in giving back. Our students actively engage in service projects that make a real difference in our community.",
        imageUrls: ["https://placehold.co/600x400.png"]
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
      return {
        ...defaultContent,
        ...data,
        heroSection: { ...defaultContent.heroSection, ...data.heroSection },
        whyUsSection: { ...defaultContent.whyUsSection, ...data.whyUsSection },
        connectWithUsSection: { ...defaultContent.connectWithUsSection, ...data.connectWithUsSection },
        signatureProgramsSection: { ...defaultContent.signatureProgramsSection, ...data.signatureProgramsSection },
        newsSection: { ...defaultContent.newsSection, ...data.newsSection },
      };
    } else {
      await setDoc(contentRef, defaultContent);
      return defaultContent;
    }
  } catch (error) {
    console.error("Error fetching website content:", error);
    return defaultContent;
  }
}

export async function updateWebsiteContent(content: WebsiteContent): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore not initialized." };
  }
  try {
    const contentRef = doc(db, "website_content", "homepage");
    await setDoc(contentRef, content, { merge: true });
    
    // Revalidate all pages that use getWebsiteContent to ensure changes are reflected.
    revalidatePath("/", "layout"); // Revalidates the entire site layout (header, footer)
    revalidatePath("/admin/dashboard"); // Revalidates the admin dashboard itself
    
    // Revalidate all individual marketing pages
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
