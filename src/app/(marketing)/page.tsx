
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { BookOpen, Trophy, Users, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: { [key: string]: LucideIcon } = {
  BookOpen,
  Trophy,
  Users,
};

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();
  const { heroSection, whyUsSection, connectWithUsSection, signatureProgramsSection, newsSection } = content;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full flex items-center justify-center text-white">
        <Image
          src={heroSection.imageUrl}
          alt="School campus"
          fill
          className="object-cover"
          priority
          data-ai-hint="school campus"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold drop-shadow-lg">{heroSection.heading}</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/90 drop-shadow-md">{heroSection.subheading}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href={heroSection.primaryCtaLink}>{heroSection.primaryCtaText}</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href={heroSection.secondaryCtaLink}>{heroSection.secondaryCtaText}</Link>
            </Button>
          </div>
        </div>
      </section>

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
      
      {/* Connect With Us Section */}
      <section className="bg-secondary">
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 text-center md:text-left">
                <h3 className="text-2xl font-headline font-semibold">{connectWithUsSection.heading}</h3>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" asChild><Link href={connectWithUsSection.inquireLink}>{connectWithUsSection.inquireText}</Link></Button>
                    <Button variant="default" size="lg" asChild><Link href={connectWithUsSection.applyLink}>{connectWithUsSection.applyText}</Link></Button>
                </div>
            </div>
        </div>
      </section>

      {/* Signature Programs Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">{signatureProgramsSection.heading}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {signatureProgramsSection.programs.map((program, index) => (
              <Card key={index} className="overflow-hidden group shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="relative h-64 w-full">
                    <Image src={program.imageUrl} alt={program.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" data-ai-hint={program.title.toLowerCase()} />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold">{program.title}</h3>
                  <p className="mt-2 text-muted-foreground">{program.description}</p>
                </CardContent>
              </Card>
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsSection.posts.map((post, index) => (
              <Card key={index} className="overflow-hidden group shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="relative h-56 w-full">
                    <Image src={post.imageUrl} alt={post.title} fill className="object-cover" data-ai-hint="school news" />
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
