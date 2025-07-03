
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function SchoolHomePage() {
  return (
    <section className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter text-primary">
          Nurturing Minds, Building Futures
        </h1>
        <p className="mx-auto mt-4 max-w-[700px] text-lg text-foreground/80">
          At St. Mbaaga's College Naddangira, we are dedicated to providing a transformative education that inspires students to achieve their full potential.
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
  );
}
