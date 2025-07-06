
import { getWebsiteContent } from "@/lib/actions/website-actions";
import Image from "next/image";

export default async function AlumniPage() {
  const content = await getWebsiteContent();
  const { alumniPage } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[30vh] w-full">
        <Image 
          src={alumniPage.heroImageUrl} 
          alt={alumniPage.title}
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="alumni reunion graduation"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{alumniPage.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">{alumniPage.description}</p>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-headline text-primary mb-4">{alumniPage.contentTitle}</h2>
          <div className="prose lg:prose-xl max-w-none text-foreground/80">
            {alumniPage.contentBody.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
