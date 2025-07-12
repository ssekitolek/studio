
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
  imageUrl: string; // Added imageUrl property
}

interface WhyUsCarouselProps {
  points: Point[];
}

export function WhyUsCarousel({ points }: WhyUsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeInfoIndex, setActiveInfoIndex] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (activeInfoIndex === null) {
        handleNext();
      }
    }, 5000);
  };

  useEffect(() => {
    if (activeInfoIndex === null) {
      resetTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, activeInfoIndex]);

  if (!points || points.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setActiveInfoIndex(null);
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? points.length - 1 : prevIndex - 1));
    resetTimer();
  };

  const handleNext = () => {
    setActiveInfoIndex(null);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % points.length);
    resetTimer();
  };
  
  const handleCardClick = (index: number) => {
    if (activeInfoIndex === index) {
        setActiveInfoIndex(null);
    } else {
        setCurrentIndex(index);
        setActiveInfoIndex(index);
    }
  };

  return (
    <div className="relative w-full h-[50vh] min-h-[400px] md:h-[65vh] md:min-h-[550px]">
      <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl card-glow">
        {points.map((point, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
              currentIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
             onClick={() => handleCardClick(index)}
          >
            <Image
              src={isValidUrl(point.imageUrl) ? point.imageUrl : "https://placehold.co/1200x800.png"}
              alt={point.title}
              fill
              className={cn(
                "object-cover cursor-pointer transition-transform duration-1000 ease-in-out",
                currentIndex === index ? "scale-105" : "scale-100"
              )}
              data-ai-hint={point.title.toLowerCase().split(' ')[0]} // Use first word of title as a hint
            />

            <div className={cn(
                "absolute inset-0 transition-all duration-700 ease-in-out",
                activeInfoIndex === index ? 'bg-black/70' : 'bg-gradient-to-t from-black/70 via-black/20 to-transparent'
            )} />

            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-primary-foreground">
                <div 
                  className={cn(
                    "transition-all duration-700 ease-in-out", 
                    activeInfoIndex === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
                >
                    <h3 className="text-2xl md:text-4xl font-headline font-bold drop-shadow-lg">{point.title}</h3>
                    <p className="mt-2 text-primary-foreground/90 max-w-2xl drop-shadow-md">{point.description}</p>
                </div>

                <div className={cn(
                    "absolute bottom-6 right-6 md:bottom-8 md:right-8 transition-all duration-500 ease-in-out",
                    activeInfoIndex === index ? "opacity-0 scale-90" : "opacity-100 scale-100"
                )}>
                    <div className="flex items-center gap-2 p-2 rounded-full bg-background/20 backdrop-blur-sm text-xs shadow-lg">
                        <Info className="h-4 w-4" />
                        <span>Click for More</span>
                    </div>
                </div>

                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setActiveInfoIndex(null); resetTimer(); }}
                    className={cn(
                        "absolute top-4 right-4 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white transition-opacity duration-300",
                        activeInfoIndex === index ? "opacity-100 rotate-90" : "opacity-0 pointer-events-none"
                    )}
                >
                    <X className="h-5 w-5" />
                </Button>
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
