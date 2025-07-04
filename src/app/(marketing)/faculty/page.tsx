
import { getWebsiteContent } from "@/lib/actions/website-actions";
import Image from "next/image";

export default async function FacultyPage() {
  const content = await getWebsiteContent();
  const { facultyPage } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[30vh] w-full">
        <Image 
          src={facultyPage.heroImageUrl} 
          alt={facultyPage.title}
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="teachers portrait"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{facultyPage.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">{facultyPage.description}</p>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-headline text-primary mb-4">{facultyPage.contentTitle}</h2>
          <div className="prose lg:prose-xl max-w-none text-foreground/80">
            {facultyPage.contentBody.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
