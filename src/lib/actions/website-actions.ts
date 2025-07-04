

'use server';

import { db } from "@/lib/firebase";
import type { WebsiteContent, SimplePageContent } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { isValidUrl } from '@/lib/utils';

const simplePageDefault = (title: string, contentTitle: string, hint: string): SimplePageContent => ({
  title: title,
  description: `A brief and engaging description for the ${title.toLowerCase()} page goes here.`,
  heroImageUrl: "https://placehold.co/1920x1080.png",
  contentTitle: contentTitle,
  contentBody: `Detailed content for the ${title.toLowerCase()} page will be displayed here. This can be edited in the admin dashboard.`
});

const defaultContent: WebsiteContent = {
  logoUrl: "https://i.imgur.com/lZDibio.png",
  heroSlideshowSection: {
    buttonText: "Inquire Now",
    buttonLink: "/contact",
    slides: [
      {
        title: "Pioneering Futures",
        subtitle: "Experience an education that transcends boundaries and unlocks potential.",
        imageUrls: ["https://placehold.co/1920x1080.png"]
      },
      {
        title: "A Canvas for Brilliance",
        subtitle: "Where creativity, technology, and ambition converge to shape the leaders of tomorrow.",
        imageUrls: ["https://placehold.co/1920x1080.png"]
      },
      {
        title: "Legacy of Excellence",
        subtitle: "Join a community dedicated to intellectual discovery and profound impact.",
        imageUrls: ["https://placehold.co/1920x1080.png"]
      }
    ]
  },
  whyUsSection: {
    heading: "The St. Mbaaga's Difference",
    description: "We are more than just a school; we are a crucible for innovation, character, and lifelong achievement.",
    points: [
      {
        icon: "BookOpen",
        title: "Visionary Academics",
        description: "Our curriculum challenges students to think critically, collaborate effectively, and solve complex problems."
      },
      {
        icon: "Users",
        title: "Dynamic Community",
        description: "We celebrate diversity and foster a sense of belonging where every student feels known, valued, and supported."
      },
      {
        icon: "Trophy",
        title: "Signature Programs",
        description: "From STEM to the arts, our specialized programs provide students with opportunities to explore their passions."
      }
    ]
  },
  signatureProgramsSection: {
    heading: "Signature Programs",
    programs: [
      { title: "STEM & Innovation", description: "Engage in hands-on learning and research in our state-of-the-art labs.", imageUrls: ["https://placehold.co/600x400.png"] },
      { title: "Global Studies", description: "Develop a global perspective through immersive cultural experiences and language studies.", imageUrls: ["https://placehold.co/600x400.png"] },
      { title: "Arts & Humanities", description: "Cultivate your creativity and find your voice in our comprehensive arts and humanities programs.", imageUrls: ["https://placehold.co/600x400.png"] }
    ]
  },
  newsSection: {
    heading: "What's Happening",
    posts: [
      { title: "Annual Science Fair Winners Announced", date: "June 20, 2025", imageUrls: ["https://placehold.co/600x400.png"] },
      { title: "Sports Day Championship Highlights", date: "June 15, 2025", imageUrls: ["https://placehold.co/600x400.png"] },
      { title: "Community Service Drive a Huge Success", date: "June 10, 2025", imageUrls: ["https://placehold.co/600x400.png"] }
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
    formUrl: "/contact",
  },
  contactPage: {
    title: "Get in Touch",
    address: "St. Mbaaga's College, Naddangira, Uganda",
    phone: "+256 758013161/ +256782923384",
    email: "ssegawarichard7@gmail.com",
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
  missionVisionPage: {
    heroTitle: "Our Guiding Principles",
    heroDescription: "Our Motto: Education for Life. The foundation of St. Mbaaga's College Naddangira's identity and educational philosophy.",
    heroImageUrl: "https://placehold.co/1920x1080.png",
    missionTitle: "Our Mission",
    missionText: "To produce citizens of moral and spiritual skills with scientific orientation to tame the changing world.",
    missionImageUrl: "https://placehold.co/600x400.png",
    visionTitle: "Our Vision",
    visionText: "To be the leading academic institution known for integrity and excellence.",
    visionImageUrl: "https://placehold.co/600x400.png",
    coreValuesTitle: "Our Core Values",
    coreValuesDescription: "The principles that guide our actions and define our community.",
    coreValues: [
      { title: "Love and Fear of God", description: "Guiding our actions with faith and reverence." },
      { title: "Discipline and Integrity", description: "Upholding strong moral principles and personal responsibility." },
      { title: "Think and Dreaming Big", description: "Encouraging ambitious goals and innovative thinking." },
      { title: "Team Work and Networking", description: "Fostering collaboration and building strong connections." },
      { title: "Respect for Authority", description: "Valuing guidance and maintaining a structured, respectful environment." },
      { title: "Openness to Diversity", description: "Embracing different perspectives and backgrounds to enrich our community." },
    ]
  },
  campusPage: simplePageDefault("Our Campus", "Explore Our Facilities", "school campus"),
  clubsPage: simplePageDefault("Clubs & Organizations", "Find Your Passion", "student club"),
  collegeCounselingPage: simplePageDefault("College Counseling", "Guidance for Your Future", "university building"),
  employmentPage: simplePageDefault("Employment", "Join Our Team", "job interview"),
  facultyPage: simplePageDefault("Our Faculty", "Meet Our Educators", "teacher portrait"),
  historyPage: simplePageDefault("Our History", "A Tradition of Excellence", "historical document"),
  parentsPage: simplePageDefault("Parent Association", "Partnering with Families", "parents meeting"),
  tuitionPage: simplePageDefault("Tuition & Fees", "Investing in Your Future", "financial document"),
  visitPage: simplePageDefault("Visit Us", "Experience Our Community", "campus welcome")
};

function deepMerge(target: any, source: any) {
  const output = { ...target };

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (Array.isArray(source[key])) {
        output[key] = source[key];
      } else if (source[key] && typeof source[key] === 'object' && key in target && target[key] && typeof target[key] === 'object') {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

function sanitizeContentUrls(content: WebsiteContent): WebsiteContent {
    const sanitized = JSON.parse(JSON.stringify(content)); 

    const sanitizeUrl = (url: any, fallback: string = 'https://placehold.co/600x400.png') => 
        isValidUrl(url) ? url : fallback;

    sanitized.logoUrl = sanitizeUrl(sanitized.logoUrl, 'https://i.imgur.com/lZDibio.png');
    sanitized.contactPage.mapImageUrl = sanitizeUrl(sanitized.contactPage.mapImageUrl, 'https://placehold.co/1200x400.png');

    const sanitizeArrayWithImages = (arr: any[], fallback: string = 'https://placehold.co/600x400.png') => {
        if (Array.isArray(arr)) {
            arr.forEach(item => {
                if (item && item.hasOwnProperty('imageUrls') && Array.isArray(item.imageUrls)) {
                    item.imageUrls = item.imageUrls.map((url: any) => sanitizeUrl(url, fallback));
                }
            });
        }
    };
    
    const sanitizeSimplePage = (page: SimplePageContent) => {
        if (page && page.hasOwnProperty('heroImageUrl')) {
            page.heroImageUrl = sanitizeUrl(page.heroImageUrl, 'https://placehold.co/1920x1080.png');
        }
    }

    sanitizeArrayWithImages(sanitized.heroSlideshowSection.slides, 'https://placehold.co/1920x1080.png');
    sanitizeArrayWithImages(sanitized.signatureProgramsSection.programs);
    sanitizeArrayWithImages(sanitized.newsSection.posts);
    sanitizeArrayWithImages(sanitized.academicsPage.programs);
    sanitizeArrayWithImages(sanitized.studentLifePage.features);
    
    if (sanitized.missionVisionPage) {
        sanitized.missionVisionPage.heroImageUrl = sanitizeUrl(sanitized.missionVisionPage.heroImageUrl, 'https://placehold.co/1920x1080.png');
        sanitized.missionVisionPage.missionImageUrl = sanitizeUrl(sanitized.missionVisionPage.missionImageUrl);
        sanitized.missionVisionPage.visionImageUrl = sanitizeUrl(sanitized.missionVisionPage.visionImageUrl);
    }

    sanitizeSimplePage(sanitized.campusPage);
    sanitizeSimplePage(sanitized.clubsPage);
    sanitizeSimplePage(sanitized.collegeCounselingPage);
    sanitizeSimplePage(sanitized.employmentPage);
    sanitizeSimplePage(sanitized.facultyPage);
    sanitizeSimplePage(sanitized.historyPage);
    sanitizeSimplePage(sanitized.parentsPage);
    sanitizeSimplePage(sanitized.tuitionPage);
    sanitizeSimplePage(sanitized.visitPage);

    return sanitized;
}


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
      const mergedContent = deepMerge(defaultContent, data);
      const sanitizedContent = sanitizeContentUrls(mergedContent);
      return sanitizedContent;
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
    
    revalidatePath("/", "layout");
    
    return { success: true, message: "Website content updated successfully." };
  } catch (error) {
    console.error("Error updating website content:", error);
    return { success: false, message: `Failed to update content: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
