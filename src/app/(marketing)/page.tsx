
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BookOpen, GraduationCap, Newspaper, Users, Globe, BarChart2 } from 'lucide-react';
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { InquireSlideshow } from '@/components/marketing/InquireSlideshow';

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();

  return (
    <>
      {/* Hero Slideshow Section */}
      <InquireSlideshow content={content.inquireSection} />

      {/* Inquire Now Button Bar */}
      <section className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto flex items-center justify-center">
          <Button size="lg" variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse">
            <Link href={content.inquireSection.buttonLink}>
              {content.inquireSection.buttonText} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
      
       {/* At a Glance Section */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold text-primary">At a Glance</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {content.atAGlance.map((stat, index) => (
                <div key={index}>
                  <p className="text-4xl font-bold text-accent">{stat.value}</p>
                  <p className="text-sm font-semibold text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
        </div>
      </section>

      {/* Program Highlights Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-headline font-bold text-primary">A Complete Education</h2>
            <p className="text-muted-foreground mt-2">Discover our core programs that shape well-rounded individuals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.programHighlights.map((program, index) => (
              <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col group transition-transform duration-300 hover:scale-[1.03]">
                <div className="relative h-56 w-full overflow-hidden">
                  <Image 
                    src={program.imageUrl} 
                    alt={program.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                    data-ai-hint={program.title.toLowerCase()}
                  />
                </div>
                <CardHeader>
                  <CardTitle>{program.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{program.description}</p>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button variant="link" className="p-0 h-auto group-hover:text-accent group-hover:gap-3 transition-all">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Community Section */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 overflow-hidden rounded-lg shadow-2xl">
              <Image 
                src={content.community.imageUrl} 
                alt={content.community.title}
                width={600}
                height={400}
                className="w-full transition-transform duration-500 hover:scale-105"
                data-ai-hint="students community"
              />
            </div>
            <div className="space-y-4 order-1 md:order-2">
              <h2 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                <Users className="h-8 w-8" />
                {content.community.title}
              </h2>
              <p className="text-foreground/80">{content.community.description}</p>
              <Button asChild>
                <Link href="/mission-vision">Our Values</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News & Events Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-headline font-bold text-primary flex items-center justify-center gap-3">
              <Newspaper className="h-8 w-8" />
              Latest News
            </h2>
            <p className="text-muted-foreground mt-2">Stay updated with the latest happenings at our school.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.news.map((item, index) => (
              <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col group transition-transform duration-300 hover:scale-[1.03]">
                 <div className="overflow-hidden">
                    <Image 
                    src={item.imageUrl} 
                    alt={item.title}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                    data-ai-hint="school event"
                    />
                 </div>
                <CardHeader>
                  <CardDescription>{item.date}</CardDescription>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
