
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';

interface InquireSlideshowProps {
  content: WebsiteContent['inquireSection'];
}

export function InquireSlideshow({ content }: InquireSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (content.slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % content.slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [content.slides.length]);

  if (!content.slides || content.slides.length === 0) {
    return null;
  }

  return (
    <section className="relative h-[70vh] w-full overflow-hidden text-primary-foreground">
      {content.slides.map((slide, index) => (
        <Image
          key={index}
          src={(slide.imageUrls && slide.imageUrls.length > 0) ? slide.imageUrls[0] : "https://placehold.co/1920x1080.png"}
          alt={slide.title}
          fill
          className={cn(
            'object-cover transition-opacity duration-1000 ease-in-out',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
          priority={index === 0}
          data-ai-hint="students learning"
        />
      ))}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center p-4">
        {content.slides.map((slide, index) => (
            <div key={index} className={cn(
            'absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out',
            index === currentIndex ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            )}>
                <div className="max-w-4xl">
                    <h2 className="text-4xl md:text-5xl font-headline font-bold">
                        {slide.title}
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
                        {slide.subtitle}
                    </p>
                </div>
            </div>
        ))}
      </div>
    </section>
  );
}
