
'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { WebsiteContent } from '@/lib/types';
import { Quote } from 'lucide-react';

interface AlumniSpotlightProps {
  content: WebsiteContent['alumniSpotlightSection'];
}

export function AlumniSpotlight({ content }: AlumniSpotlightProps) {
  if (!content.spotlights || content.spotlights.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full max-w-5xl mx-auto"
    >
      <CarouselContent>
        {content.spotlights.map((spotlight, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card className="overflow-hidden shadow-lg border-2">
                <CardContent className="flex flex-col md:flex-row items-center justify-center p-0">
                  <div className="relative w-full md:w-1/3 h-64 md:h-96">
                    <Image
                      src={spotlight.imageUrl}
                      alt={spotlight.name}
                      fill
                      className="object-cover"
                      data-ai-hint="person portrait"
                    />
                  </div>
                  <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center">
                    <Quote className="w-12 h-12 text-primary/20 mb-4" />
                    <p className="text-lg md:text-xl text-foreground/80 italic leading-relaxed">
                      {spotlight.quote}
                    </p>
                    <div className="mt-6 text-right">
                      <p className="font-headline text-xl font-semibold text-primary">
                        {spotlight.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {spotlight.graduationYear}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex" />
      <CarouselNext className="hidden sm:flex" />
    </Carousel>
  );
}
