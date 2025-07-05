
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
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{whyUsSection.description}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUsSection.points.map((point, index) => {
              const Icon = iconMap[point.icon] || BookOpen;
              return (
                <Card 
                  key={index} 
                  className="text-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 group animate-fade-in-up opacity-0 border-2 border-transparent hover:border-primary"
                  style={{ animationDelay: `${300 + index * 200}ms`, animationFillMode: 'forwards' }}
                >
                  <CardContent className="pt-8 flex flex-col items-center">
                    <div className="flex justify-center items-center h-20 w-20 rounded-full bg-primary/10 mx-auto transition-all duration-300 group-hover:bg-primary group-hover:scale-110">
                      <Icon className="h-10 w-10 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold font-headline">{point.title}</h3>
                    <p className="mt-2 text-muted-foreground">{point.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Signature Programs Section */}
      <section className="py-16 md:py-24 bg-secondary">
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
      <section className="py-16 md:py-24">
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
