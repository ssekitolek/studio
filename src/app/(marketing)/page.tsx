
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { BookOpen, Users, Trophy, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: { [key: string]: LucideIcon } = {
  BookOpen,
  Users,
  Trophy,
};

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { whyUsSection, signatureProgramsSection, newsSection } = content;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative h-[60vh] w-full flex items-center justify-center text-center text-primary-foreground">
        <Image
          src="https://placehold.co/1920x1080.png"
          alt="Legacy of Excellence"
          fill
          className="object-cover"
          priority
          data-ai-hint="campus building"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-4">
          <h1 className="text-4xl md:text-7xl font-headline font-bold drop-shadow-2xl">
            Legacy of Excellence
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90 drop-shadow-lg">
            Join a community dedicated to intellectual discovery and profound impact.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild className="text-lg py-7 px-10 bg-destructive hover:bg-destructive/80 text-destructive-foreground transition-transform hover:scale-105">
              <Link href="/contact">
                Inquire Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-16 md:py-24 bg-background">
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
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{signatureProgramsSection.heading}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {signatureProgramsSection.programs.map((program, index) => (
              <Card key={index} className="bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <div className="relative h-64 w-full">
                  <Image
                    src={(program.imageUrls && program.imageUrls.length > 0) ? program.imageUrls[0] : "https://placehold.co/600x400.png"}
                    alt={program.title}
                    fill
                    className="object-cover"
                    data-ai-hint={program.title.toLowerCase()}
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold font-headline">{program.title}</h3>
                  <p className="mt-2 text-muted-foreground">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{newsSection.heading}</h2>
            <Button variant="link" asChild>
                <Link href="#">All News <ArrowRight className="ml-2" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsSection.posts.map((post, index) => (
              <Card key={index} className="bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                 <div className="relative h-64 w-full">
                  <Image
                    src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"}
                    alt={post.title}
                    fill
                    className="object-cover"
                    data-ai-hint="school news event"
                  />
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{post.date}</p>
                  <h3 className="text-xl font-bold font-headline mt-2">{post.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
