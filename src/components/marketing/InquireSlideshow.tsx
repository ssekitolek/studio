
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface InquireSlideshowProps {
  content: WebsiteContent['heroSlideshowSection'];
}

export function InquireSlideshow({ content }: InquireSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (content.slides.length <= 1) return;

    const interval = setInterval(() => {
      setIsAnimatingOut(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % content.slides.length);
        setIsAnimatingOut(false);
      }, 1000); // Wait for fade out animation to finish
    }, 7000); // Change slide every 7 seconds

    return () => clearInterval(interval);
  }, [content.slides.length]);

  if (!content.slides || content.slides.length === 0) {
    return null;
  }

  return (
    <section className="relative h-[80vh] w-full overflow-hidden text-primary-foreground">
      {content.slides.map((slide, index) => (
        <Image
          key={index}
          src={(slide.imageUrls && slide.imageUrls.length > 0) ? slide.imageUrls[0] : "https://placehold.co/1920x1080.png"}
          alt={slide.title}
          fill
          className={cn(
            'object-cover transition-opacity duration-1000 ease-in-out animate-image-zoom',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
          priority={index === 0}
          data-ai-hint="abstract architecture"
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      <div className="relative z-10 flex h-full flex-col items-center justify-end text-center p-8 md:p-16">
        <div className="max-w-4xl mb-12">
            <h1 className={cn("text-4xl md:text-7xl font-headline font-bold drop-shadow-2xl transition-all duration-1000 ease-in-out", isAnimatingOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0')}>
                {content.slides[currentIndex].title}
            </h1>
            <p className={cn("mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90 drop-shadow-lg transition-all duration-1000 ease-in-out delay-200", isAnimatingOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0')}>
                {content.slides[currentIndex].subtitle}
            </p>
             <div className={cn("mt-8 transition-all duration-1000 ease-in-out delay-300", isAnimatingOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0')}>
                <Button size="lg" asChild className="text-lg py-7 px-10 bg-primary hover:bg-primary/80 transition-transform hover:scale-105">
                    <Link href={content.buttonLink}>
                        {content.buttonText} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </div>
      </div>
    </section>
  );
}
