
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BookOpen, GraduationCap, Newspaper, Users, Zap } from 'lucide-react';
import { getWebsiteContent } from '@/lib/actions/website-actions';

const featureIcons = [Zap, GraduationCap, Users];

export default async function SchoolHomePage() {
  const content = await getWebsiteContent();

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter text-primary">
            {content.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80">
            {content.hero.subtitle}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login/teacher">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-headline font-bold text-primary">Why Choose Us?</h2>
            <p className="text-muted-foreground mt-2">Discover the advantages of a St. Mbaaga's education.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.features.map((feature, index) => {
              const Icon = featureIcons[index] || Zap; // Fallback icon
              return (
                <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Academics Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                <BookOpen className="h-8 w-8" />
                {content.academics.title}
              </h2>
              <p className="text-foreground/80">{content.academics.description}</p>
              <Button asChild>
                <Link href="/mission-vision">Learn More</Link>
              </Button>
            </div>
            <div>
              <Image 
                src={content.academics.imageUrl} 
                alt={content.academics.title}
                width={600}
                height={400}
                className="rounded-lg shadow-2xl w-full"
                data-ai-hint="students learning"
              />
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
              News & Events
            </h2>
            <p className="text-muted-foreground mt-2">Stay updated with the latest happenings at our school.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.news.map((item, index) => (
              <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                <Image 
                  src={item.imageUrl} 
                  alt={item.title}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                  data-ai-hint="school event"
                />
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.date}</CardDescription>
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
