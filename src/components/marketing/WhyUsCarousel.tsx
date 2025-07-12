
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';
import { isValidUrl } from '@/lib/utils';

interface Point {
  icon: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface WhyUsCarouselProps {
  points: Point[];
}

export function WhyUsCarousel({ points }: WhyUsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  if (!points || points.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? points.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % points.length);
  };

  return (
    <div className="relative w-full h-[50vh] min-h-[400px] md:h-[65vh] md:min-h-[550px]">
      <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl">
        {points.map((point, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
              currentIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <Image
              src={isValidUrl(point.imageUrl) ? point.imageUrl : "https://placehold.co/1200x800.png"}
              alt={point.title}
              fill
              className="object-cover"
              data-ai-hint={point.title.toLowerCase().split(' ')[0]}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-primary-foreground">
              <div>
                <h3 className="text-2xl md:text-4xl font-headline font-bold drop-shadow-lg">{point.title}</h3>
                <p className="mt-2 text-primary-foreground/90 max-w-2xl drop-shadow-md">{point.description}</p>
              </div>
            </div>
          </div>
        ))}

        <Button
            variant="secondary"
            size="icon"
            className="absolute top-1/2 left-2 md:left-4 -translate-y-1/2 rounded-full shadow-md z-10"
            onClick={handlePrev}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 right-2 md:right-4 -translate-y-1/2 rounded-full shadow-md z-10"
          onClick={handleNext}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
