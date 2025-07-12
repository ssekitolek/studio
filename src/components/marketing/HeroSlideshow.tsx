
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HeroSlideshowProps {
  content: WebsiteContent['heroSlideshowSection'];
}

export function HeroSlideshow({ content }: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (content.slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % content.slides.length);
    }, 7000); // Change slide every 7 seconds

    return () => clearInterval(interval);
  }, [content.slides.length]);

  if (!content.slides || content.slides.length === 0) {
    return null;
  }

  return (
    <section className="group relative h-[70vh] min-h-[500px] w-full overflow-hidden text-primary-foreground">
      {content.slides.map((slide, index) => (
        <Image
          key={index}
          src={(slide.imageUrls && slide.imageUrls.length > 0) ? slide.imageUrls[0] : "https://placehold.co/1920x1080.png"}
          alt={slide.title}
          fill
          className={cn(
            'object-cover transition-opacity duration-[2000ms] ease-in-out group-hover:animate-image-zoom',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
          priority={index === 0}
          data-ai-hint="school students happy"
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-primary/20 to-transparent" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center p-8">
        {content.slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              'absolute transition-all duration-1000 ease-in-out max-w-4xl',
              currentIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            )}
          >
            <h1 className="text-4xl md:text-7xl font-headline font-bold text-white drop-shadow-2xl">
                {slide.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 drop-shadow-lg">
                {slide.subtitle}
            </p>
             <div className="mt-8">
                <Button size="lg" asChild className="text-lg py-7 px-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-transform hover:scale-105 shadow-lg">
                    <Link href={content.buttonLink}>
                        {content.buttonText} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
