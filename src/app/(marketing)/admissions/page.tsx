
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default async function AdmissionsPage() {
  const content = await getWebsiteContent();
  const { admissionsPage } = content;

  return (
    <div className="overflow-x-hidden animate-fade-in-up">
       <div className="relative h-[30vh] w-full">
        <Image 
          src="https://placehold.co/1920x1080.png" 
          alt="Admissions at St. Mbaaga's" 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="students smiling"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{admissionsPage.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">{admissionsPage.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-headline text-primary text-center mb-12 animate-fade-in-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>Admissions Process</h2>
          <div className="relative border-l-2 border-primary/20 pl-10 space-y-12">
            {admissionsPage.process.map((item, index) => (
              <div 
                key={index} 
                className="relative group animate-fade-in-up opacity-0"
                style={{ animationDelay: `${200 + index * 150}ms`, animationFillMode: 'forwards' }}
              >
                <div className="absolute -left-[11px] top-4 h-5 w-5 bg-background border-2 border-primary rounded-full transition-colors duration-300 group-hover:bg-accent" />
                <div className="absolute -left-[50px] top-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:-rotate-12 shadow-lg">
                  {item.step}
                </div>
                <div className="transition-transform duration-300 group-hover:translate-x-2">
                  <h3 className="text-2xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center animate-fade-in-up opacity-0" style={{ animationDelay: `${200 + admissionsPage.process.length * 150}ms`, animationFillMode: 'forwards' }}>
              <Button size="lg" asChild className="text-lg py-7 px-10">
                  <Link href={admissionsPage.formUrl}>
                      Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
