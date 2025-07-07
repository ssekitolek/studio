

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { ArrowRight } from 'lucide-react';
import { SignatureProgramsCarousel } from '@/components/marketing/SignatureProgramsCarousel';
import { NewsCarousel } from '@/components/marketing/NewsCarousel';
import { HeroSlideshow } from '@/components/marketing/HeroSlideshow';
import { WhyUsCarousel } from '@/components/marketing/WhyUsCarousel';


export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { heroSlideshowSection, whyUsSection, signatureProgramsSection, newsSection } = content;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <HeroSlideshow content={heroSlideshowSection} />

      {/* Why Us Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 
              className="text-3xl md:text-4xl font-headline font-bold text-primary animate-fade-in-up opacity-0"
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              {whyUsSection.heading}
            </h2>
            <p 
              className="mt-4 text-lg text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            >
              {whyUsSection.description}
            </p>
          </div>
          <WhyUsCarousel points={whyUsSection.points} />
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
          <NewsCarousel posts={newsSection.posts} />
        </div>
      </section>
    </div>
  );
}
