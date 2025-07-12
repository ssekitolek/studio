
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { ArrowRight, BookOpen, Shield, Palette, BrainCircuit, HeartHandshake } from 'lucide-react';
import { SignatureProgramsCarousel } from '@/components/marketing/SignatureProgramsCarousel';
import { NewsCarousel } from '@/components/marketing/NewsCarousel';
import { HeroSlideshow } from '@/components/marketing/HeroSlideshow';
import { WhyUsCarousel } from '@/components/marketing/WhyUsCarousel';
import { AlumniSpotlight } from '@/components/marketing/AlumniSpotlight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import type { ReactElement } from 'react';

const iconMap: { [key: string]: ReactElement } = {
  Athletics: <Shield className="h-10 w-10 text-primary mb-4" />,
  "Arts & Music": <Palette className="h-10 w-10 text-primary mb-4" />,
  "Clubs & Organizations": <BrainCircuit className="h-10 w-10 text-primary mb-4" />,
  "Community Service": <HeartHandshake className="h-10 w-10 text-primary mb-4" />,
};

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { 
    heroSlideshowSection, 
    whyUsSection,
    signatureProgramsSection,
    alumniSpotlightSection, 
    newsSection
  } = content;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <HeroSlideshow content={heroSlideshowSection} />

      {/* Main Content Wrapper */}
      <div className="animate-fade-in-up" style={{ animationDuration: '1.2s' }}>
        
        {/* Why Us Section */}
        <section id="why-us" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{whyUsSection.description}</p>
            </div>
            <div className="opacity-0 animate-fade-in-right" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '1s' }}>
              <WhyUsCarousel points={whyUsSection.points} />
            </div>
          </div>
        </section>
        
        {/* Signature Programs Section */}
        <section id="signature-programs" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{signatureProgramsSection.heading}</h2>
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '1s' }}>
              <SignatureProgramsCarousel programs={signatureProgramsSection.programs} />
            </div>
          </div>
        </section>

        {/* Alumni Spotlight Section */}
        <section id="alumni-spotlight" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{alumniSpotlightSection.heading}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{alumniSpotlightSection.description}</p>
            </div>
            <div className="opacity-0 animate-fade-in-left" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '1s' }}>
              <AlumniSpotlight content={alumniSpotlightSection} />
            </div>
          </div>
        </section>

        {/* News Section */}
        <section id="news" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left mb-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{newsSection.heading}</h2>
                <p className="mt-4 text-lg text-muted-foreground">Stay connected with the latest stories, achievements, and events from our vibrant community.</p>
              </div>
              <Button variant="outline" asChild className="mt-6 md:mt-0">
                <Link href="/news">View All News <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '1s' }}>
              <NewsCarousel posts={newsSection.posts} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
