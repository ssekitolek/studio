
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
    newsSection,
    academicsPage,
    admissionsPage,
    studentLifePage
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
            <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{whyUsSection.heading}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{whyUsSection.description}</p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <WhyUsCarousel points={whyUsSection.points} />
            </div>
          </div>
        </section>

        {/* Signature Programs Section (Re-labeled as Academics) */}
        <section id="academics" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{academicsPage.title}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{academicsPage.description}</p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {academicsPage.programs.map((program, index) => (
                  <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03] border-2 border-transparent hover:border-primary">
                    <div className="relative h-64 w-full overflow-hidden">
                      <Image
                        src={(program.imageUrls && program.imageUrls.length > 0) ? program.imageUrls[0] : "https://placehold.co/600x400.png"}
                        alt={program.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                        data-ai-hint={program.name.toLowerCase()}
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-headline text-primary">{program.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground">{program.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
             <div className="text-center mt-16 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <Button asChild size="lg">
                    <Link href="/academics">Learn More <ArrowRight className="ml-2"/></Link>
                </Button>
            </div>
          </div>
        </section>

        {/* Student Life Section */}
        <section id="student-life" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
             <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{studentLifePage.title}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{studentLifePage.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              {studentLifePage.features.map((feature, index) => (
                <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03] border-2 border-transparent hover:border-primary">
                   <div className="relative h-72 w-full overflow-hidden">
                      <Image
                          src={(feature.imageUrls && feature.imageUrls.length > 0) ? feature.imageUrls[0] : "https://placehold.co/600x400.png"}
                          alt={feature.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                          data-ai-hint={feature.title.toLowerCase().replace(/ & /g, " ")}
                      />
                  </div>
                  <CardHeader className="items-center text-center pt-8">
                    {iconMap[feature.title] || <BrainCircuit className="h-10 w-10 text-primary mb-4" />}
                    <CardTitle className="text-xl font-headline text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow text-center">
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
             <div className="text-center mt-16 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <Button asChild size="lg">
                    <Link href="/student-life">Explore Community <ArrowRight className="ml-2"/></Link>
                </Button>
            </div>
          </div>
        </section>

        {/* Admissions Section */}
        <section id="admissions" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{admissionsPage.title}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{admissionsPage.description}</p>
            </div>
             <div className="max-w-4xl mx-auto">
              <div className="relative border-l-2 border-primary/20 pl-10 space-y-12">
                {admissionsPage.process.map((item, index) => (
                  <div 
                    key={index} 
                    className="relative group animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${400 + index * 150}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="absolute -left-[11px] top-4 h-5 w-5 bg-background border-2 border-primary rounded-full transition-colors duration-300 group-hover:bg-accent" />
                    <div className="absolute -left-[50px] top-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:-rotate-12 shadow-lg">
                      {item.step}
                    </div>
                    <div className="transition-transform duration-300 group-hover:translate-x-2">
                      <h3 className="text-2xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">{item.title}</h3>
                      <p className="mt-2 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-16 text-center animate-fade-in-up opacity-0" style={{ animationDelay: `${400 + admissionsPage.process.length * 150}ms`, animationFillMode: 'forwards' }}>
                  <Button size="lg" asChild className="text-lg py-7 px-10">
                      <Link href="/contact">
                          Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                  </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Alumni Spotlight Section */}
        <section id="alumni-spotlight" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{alumniSpotlightSection.heading}</h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground">{alumniSpotlightSection.description}</p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <AlumniSpotlight content={alumniSpotlightSection} />
            </div>
          </div>
        </section>

        {/* News Section */}
        <section id="news" className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left mb-16 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary">{newsSection.heading}</h2>
                <p className="mt-4 text-lg text-muted-foreground">Stay connected with the latest stories, achievements, and events from our vibrant community.</p>
              </div>
              <Button variant="outline" asChild className="mt-6 md:mt-0">
                <Link href="/news">View All News <ArrowRight className="ml-2" /></Link>
              </Button>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <NewsCarousel posts={newsSection.posts} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
