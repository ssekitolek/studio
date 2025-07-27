
'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { WebsiteContent } from '@/lib/types';
import { isValidUrl } from '@/lib/utils';

interface AdministrationSectionProps {
  content: WebsiteContent['administrationSection'];
}

export function AdministrationSection({ content }: AdministrationSectionProps) {
  if (!content.administrators || content.administrators.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto"
    >
      <CarouselContent>
        {content.administrators.map((admin, index) => (
          <CarouselItem key={index} className="sm:basis-1/2 lg:basis-1/3">
            <div className="p-1">
              <div className="group relative overflow-hidden rounded-lg shadow-lg h-[400px] block">
                <Image
                  src={isValidUrl(admin.imageUrl) ? admin.imageUrl : "https://placehold.co/400x400.png"}
                  alt={admin.name}
                  fill
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                  data-ai-hint="person portrait professional"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <h3 className="text-xl font-headline font-bold drop-shadow-md">{admin.name}</h3>
                  <p className="mt-1 text-white/90 drop-shadow-sm">{admin.title}</p>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex" />
      <CarouselNext className="hidden sm:flex" />
    </Carousel>
  );
}
