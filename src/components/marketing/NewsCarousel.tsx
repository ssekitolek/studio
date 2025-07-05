
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { WebsiteContent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NewsCarouselProps {
  posts: WebsiteContent['newsSection']['posts'];
}

export function NewsCarousel({ posts }: NewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [visibleSlides, setVisibleSlides] = useState(3);

  // Determine number of visible slides based on screen size
  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 768) {
        setVisibleSlides(1);
      } else if (window.innerWidth < 1024) {
        setVisibleSlides(2);
      } else {
        setVisibleSlides(3);
      }
    };

    updateVisibleSlides();
    window.addEventListener('resize', updateVisibleSlides);
    return () => window.removeEventListener('resize', updateVisibleSlides);
  }, []);
  
  const maxIndex = posts.length > visibleSlides ? posts.length - visibleSlides : 0;

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < maxIndex ? prevIndex + 1 : 0));
  };

  const handleCardClick = (index: number) => {
    setActivePostIndex(index);
  };
  
  const handleCloseOverlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from firing again
    setActivePostIndex(null);
  }

  const slideWidthPercentage = 100 / visibleSlides;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden relative" ref={carouselRef}>
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * slideWidthPercentage}%)` }}
        >
          {posts.map((post, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 px-2"
              style={{ width: `${slideWidthPercentage}%` }}
              onClick={() => handleCardClick(index)}
            >
              <Card className="overflow-hidden group shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer h-[450px]">
                <Image
                  src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  data-ai-hint="school news event"
                />
                
                <div className={cn(
                    "absolute inset-0 bg-black/70 flex flex-col justify-end p-6 text-white transition-opacity duration-300",
                    activePostIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                    <Button
                       onClick={handleCloseOverlay}
                       className={cn(
                           "absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 h-auto w-auto transition-opacity",
                           activePostIndex === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        )}
                       aria-label="Close"
                    >
                      <X className="h-5 w-5"/>
                    </Button>
                    <p className="mb-2 text-sm text-primary-foreground/80">
                        {post.date}
                    </p>
                    <h3 className="text-2xl font-bold font-headline">
                        {post.title}
                    </h3>
                  </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {posts.length > visibleSlides && (
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
