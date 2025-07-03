
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Heart, ArrowRight } from 'lucide-react';
import { getWebsiteContent } from '@/lib/actions/website-actions';

export const dynamic = 'force-dynamic';

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter text-primary">
            {content.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80">
            {content.hero.subtitle}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#academics">
                Learn More <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-headline font-bold text-center text-primary">Why Choose Us?</h2>
          <p className="text-center text-muted-foreground mt-2 mb-12">Our commitment to excellence in every aspect of education.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {index === 0 ? <BookOpen className="h-8 w-8" /> : index === 1 ? <Users className="h-8 w-8" /> : <Heart className="h-8 w-8" />}
                  </div>
                  <CardTitle className="mt-4 font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Visual Break Section */}
      <section id="academics" className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12 px-4 md:px-6">
              <div className="space-y-4">
                  <h2 className="text-3xl font-headline font-bold">{content.academics.title}</h2>
                  <p className="text-lg text-primary-foreground/80">
                      {content.academics.description}
                  </p>
                   <Button variant="secondary" size="lg">Explore Our Curriculum</Button>
              </div>
              <div className="flex justify-center">
                  <Image
                      src={content.academics.imageUrl}
                      alt="Students in a classroom"
                      width={500}
                      height={350}
                      className="rounded-lg shadow-2xl"
                      data-ai-hint="students classroom"
                  />
              </div>
          </div>
      </section>

      {/* News & Events Section */}
      <section id="news" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-headline font-bold text-center text-primary">Latest News & Events</h2>
          <p className="text-center text-muted-foreground mt-2 mb-12">Stay up-to-date with what's happening at St. Mbaaga's College Naddangira.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.news.map((item, index) => (
                <Card key={index} className="overflow-hidden group">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    data-ai-hint={index === 0 ? "science fair" : index === 1 ? "sports competition" : "community service"}
                  />
                  <CardHeader>
                    <CardTitle className="font-headline text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
