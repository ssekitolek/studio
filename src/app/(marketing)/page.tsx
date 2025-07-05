
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { BookOpen, Users, Trophy, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InquireSlideshow } from '@/components/marketing/InquireSlideshow';
import { SignatureProgramsCarousel } from '@/components/marketing/SignatureProgramsCarousel';
import { NewsCarousel } from '@/components/marketing/NewsCarousel';

const iconMap: { [key: string]: LucideIcon } = {
  BookOpen,
  Users,
  Trophy,
};

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { heroSlideshowSection, whyUsSection, signatureProgramsSection, newsSection } = content;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <InquireSlideshow content={heroSlideshowSection} />

      {/* Why Us Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{whyUsSection.description}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUsSection.points.map((point, index) => {
              const Icon = iconMap[point.icon] || BookOpen;
              return (
                <div key={index} className="text-center p-8 bg-background rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                  <div className="p-4 inline-block bg-primary/10 rounded-full mb-6">
                     <Icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold font-headline">{point.title}</h3>
                  <p className="mt-2 text-muted-foreground">{point.description}</p>
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
          <NewsCarousel posts={newsSection.posts} />
        </div>
      </section>
    </div>
  );
}
