
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { BookOpen, Trophy, Users, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InquireSlideshow } from '@/components/marketing/InquireSlideshow';
import { SignatureProgramsCarousel } from '@/components/marketing/SignatureProgramsCarousel';

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
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{whyUsSection.description}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUsSection.points.map((point, index) => {
              const Icon = iconMap[point.icon] || BookOpen;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center items-center h-16 w-16 rounded-full bg-primary/10 mx-auto">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{point.title}</h3>
                  <p className="mt-2 text-muted-foreground">{point.description}</p>
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsSection.posts.map((post, index) => (
              <Card key={index} className="overflow-hidden group shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="relative h-56 w-full">
                    <Image src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"} alt={post.title} fill className="object-cover" data-ai-hint="school news" />
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{post.date}</p>
                  <h3 className="mt-2 text-lg font-semibold text-primary group-hover:underline">{post.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
