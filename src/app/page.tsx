import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Heart, LogIn, ArrowRight } from 'lucide-react';

export default function SchoolHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <path d="m12 7 2 4 4-2-2 4 4 2-4-2-2 4-2-4-4 2 2-4-4-2 4 2z" />
            </svg>
            <span className="text-xl font-headline font-bold text-primary">
              Grade<span className="text-accent">Central</span> Academy
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#about" className="text-muted-foreground transition-colors hover:text-primary">
              About Us
            </Link>
            <Link href="#academics" className="text-muted-foreground transition-colors hover:text-primary">
              Academics
            </Link>
            <Link href="#admissions" className="text-muted-foreground transition-colors hover:text-primary">
              Admissions
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login/teacher">
                <LogIn className="mr-2 h-4 w-4" /> Teacher Portal
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/login/dos">
                D.O.S. Portal
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter text-primary">
              Nurturing Minds, Building Futures
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80">
              At GradeCentral Academy, we are dedicated to providing a transformative education that inspires students to achieve their full potential.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="#admissions">
                  Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
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
              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <CardTitle className="mt-4 font-headline">Excellence in Education</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our rigorous academic curriculum is designed to challenge students and foster a love for lifelong learning.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-8 w-8" />
                  </div>
                  <CardTitle className="mt-4 font-headline">Holistic Development</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We focus on developing the whole person through a rich program of arts, sports, and community service.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Heart className="h-8 w-8" />
                  </div>
                  <CardTitle className="mt-4 font-headline">Vibrant Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A supportive and inclusive environment where every student feels valued, respected, and empowered to succeed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Visual Break Section */}
        <section id="academics" className="py-20 md:py-32 bg-primary text-primary-foreground">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12 px-4 md:px-6">
                <div className="space-y-4">
                    <h2 className="text-3xl font-headline font-bold">A World-Class Academic Program</h2>
                    <p className="text-lg text-primary-foreground/80">
                        From science and technology to arts and humanities, our programs are designed to inspire curiosity and prepare students for the challenges of tomorrow.
                    </p>
                     <Button variant="secondary" size="lg">Explore Our Curriculum</Button>
                </div>
                <div className="flex justify-center">
                    <Image
                        src="https://placehold.co/600x400.png"
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
            <p className="text-center text-muted-foreground mt-2 mb-12">Stay up-to-date with what's happening at GradeCentral Academy.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="overflow-hidden group">
                <Image
                  src="https://placehold.co/600x400.png"
                  alt="Science Fair"
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  data-ai-hint="science fair"
                />
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Annual Science Fair Winners Announced</CardTitle>
                  <CardDescription>June 20, 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Congratulations to our brilliant young scientists who showcased incredible projects this year.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden group">
                <Image
                  src="https://placehold.co/600x400.png"
                  alt="Sports Day"
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  data-ai-hint="sports competition"
                />
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Sports Day Championship Highlights</CardTitle>
                  <CardDescription>June 15, 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    A day of thrilling competition and great sportsmanship. See the results and photo gallery.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden group">
                 <Image
                  src="https://placehold.co/600x400.png"
                  alt="Community Service"
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  data-ai-hint="community service"
                />
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Community Service Drive a Huge Success</CardTitle>
                  <CardDescription>June 10, 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Our students volunteered over 500 hours to support local charities and community projects.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-8">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm">&copy; {new Date().getFullYear()} GradeCentral Academy. All rights reserved.</p>
          <nav className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="text-sm hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="text-sm hover:text-primary">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
