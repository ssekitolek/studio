
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { BookOpen, Trophy, Users, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InquireSlideshow } from '@/components/marketing/InquireSlideshow';
import { SignatureProgramsCarousel } from '@/components/marketing/SignatureProgramsCarousel';
import { NewsCarousel } from '@/components/marketing/NewsCarousel';

const iconMap: { [key: string]: LucideIcon } = {
  BookOpen,
  Trophy,
  Users,
};

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { whyUsSection, signatureProgramsSection, newsSection, heroSlideshowSection } = content;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <InquireSlideshow content={heroSlideshowSection} />

      {/* Why Us Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{whyUsSection.description}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUsSection.points.map((point, index) => {
              const Icon = iconMap[point.icon] || BookOpen;
              return (
                <div 
                  key={index}
                  className="group relative rounded-lg bg-background p-8 text-left shadow-lg overflow-hidden transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-2 animate-fade-in-up opacity-0 group-hover:bg-accent/10"
                  style={{ animationDelay: `${300 + index * 200}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 rounded-bl-full transition-all duration-500 group-hover:scale-[8] group-hover:bg-primary group-hover:opacity-100"></div>
                  
                  <div className="relative z-10">
                    <div className="p-4 inline-block bg-primary/10 rounded-lg mb-6 group-hover:bg-primary-foreground/10 transition-colors duration-500">
                      <Icon className="h-10 w-10 text-primary transition-colors duration-500 group-hover:text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold font-headline text-foreground group-hover:text-primary-foreground transition-colors duration-500">{point.title}</h3>
                    <p className="mt-2 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-500">{point.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Signature Programs Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{signatureProgramsSection.heading}</h2>
          </div>
          <div className="mt-12">
            <SignatureProgramsCarousel programs={signatureProgramsSection.programs} />
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{newsSection.heading}</h2>
            <Button variant="link" asChild>
                <Link href="#">All News <ArrowRight className="ml-2" /></Link>
            </Button>
          </div>
          <div className="mt-12">
            <NewsCarousel posts={newsSection.posts} />
          </div>
        </div>
      </section>
    </div>
  );
}
