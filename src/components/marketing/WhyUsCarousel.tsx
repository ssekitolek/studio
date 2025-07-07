
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';

interface Point {
  icon: string;
  title: string;
  description: string;
}

interface WhyUsCarouselProps {
  points: Point[];
}

const placeholderImages = [
    { src: "https://placehold.co/1200x800.png", hint: "academics book" },
    { src: "https://placehold.co/1200x800.png", hint: "community students" },
    { src: "https://placehold.co/1200x800.png", hint: "programs stem" }
];

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
    }, 5000); // 5 second auto-slide
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

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? points.length - 1 : prevIndex - 1));
    setActiveInfoIndex(null);
    resetTimer();
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % points.length);
    setActiveInfoIndex(null);
    resetTimer();
  };
  
  const handleCardClick = (index: number) => {
    if (activeInfoIndex === index) {
        setActiveInfoIndex(null); // Toggle off if already active
    } else {
        setCurrentIndex(index);
        setActiveInfoIndex(index);
    }
  };

  return (
    <div className="relative w-full h-[50vh] min-h-[400px] md:h-[60vh] md:min-h-[500px]">
      <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl">
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
              src={placeholderImages[index % placeholderImages.length].src}
              alt={point.title}
              fill
              className="object-cover cursor-pointer"
              data-ai-hint={placeholderImages[index % placeholderImages.length].hint}
            />

            <div className={cn(
                "absolute inset-0 transition-all duration-500 ease-in-out",
                activeInfoIndex === index ? 'bg-black/70' : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'
            )} />

            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-primary-foreground">
                <div 
                  className={cn("transition-all duration-500 ease-in-out", activeInfoIndex === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}
                >
                    <h3 className="text-2xl md:text-3xl font-headline font-bold">{point.title}</h3>
                    <p className="mt-2 text-primary-foreground/90 max-w-2xl">{point.description}</p>
                </div>

                <div className={cn(
                    "absolute bottom-6 right-6 md:bottom-8 md:right-8 transition-all duration-500 ease-in-out",
                    activeInfoIndex === index ? "opacity-0 scale-90" : "opacity-100 scale-100"
                )}>
                    <div className="flex items-center gap-2 p-2 rounded-full bg-background/20 backdrop-blur-sm text-xs">
                        <Info className="h-4 w-4" />
                        <span>Click to Read More</span>
                    </div>
                </div>

                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setActiveInfoIndex(null); resetTimer(); }}
                    className={cn(
                        "absolute top-4 right-4 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white transition-opacity duration-300",
                        activeInfoIndex === index ? "opacity-100" : "opacity-0 pointer-events-none"
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
