
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { WebsiteContent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SignatureProgramsCarouselProps {
  programs: WebsiteContent['signatureProgramsSection']['programs'];
}

export function SignatureProgramsCarousel({ programs }: SignatureProgramsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeProgramIndex, setActiveProgramIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [visibleSlides, setVisibleSlides] = useState(3);

  // Determine number of visible slides based on screen size
  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 768) {
        setVisibleSlides(1);
      } else {
        setVisibleSlides(3);
      }
    };

    updateVisibleSlides();
    window.addEventListener('resize', updateVisibleSlides);
    return () => window.removeEventListener('resize', updateVisibleSlides);
  }, []);
  
  const maxIndex = programs.length > visibleSlides ? programs.length - visibleSlides : 0;

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < maxIndex ? prevIndex + 1 : 0));
  };

  const handleCardClick = (index: number) => {
    setActiveProgramIndex(index);
  };
  
  const handleCloseOverlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from firing again
    setActiveProgramIndex(null);
  }

  const slideWidthPercentage = 100 / visibleSlides;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden relative" ref={carouselRef}>
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * slideWidthPercentage}%)` }}
        >
          {programs.map((program, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 px-2"
              style={{ width: `${slideWidthPercentage}%` }}
              onClick={() => handleCardClick(index)}
            >
              <Card className="overflow-hidden group shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer h-[450px]">
                <Image
                  src={(program.imageUrls && program.imageUrls.length > 0) ? program.imageUrls[0] : "https://placehold.co/600x400.png"}
                  alt={program.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  data-ai-hint={program.title.toLowerCase()}
                />
                
                <div className={cn(
                    "absolute inset-0 bg-black/70 flex flex-col justify-end p-6 text-white transition-opacity duration-300",
                    activeProgramIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                    <Button
                       onClick={handleCloseOverlay}
                       className={cn(
                           "absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 h-auto w-auto transition-opacity",
                           activeProgramIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        )}
                       aria-label="Close"
                    >
                      <X className="h-5 w-5"/>
                    </Button>
                    <h3 className="text-2xl font-bold font-headline">
                        {program.title}
                    </h3>
                    <p className="mt-2 text-sm">
                        {program.description}
                    </p>
                  </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {programs.length > visibleSlides && (
        <>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full shadow-md z-10 md:-left-4"
          onClick={handlePrev}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full shadow-md z-10 md:-right-4"
          onClick={handleNext}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        </>
      )}
    </div>
  );
}
