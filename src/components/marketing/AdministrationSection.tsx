
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
              <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group text-center border-2 border-transparent hover:border-primary hover:scale-[1.02]">
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image
                    src={isValidUrl(admin.imageUrl) ? admin.imageUrl : "https://placehold.co/400x400.png"}
                    alt={admin.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                    data-ai-hint="person portrait professional"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary">{admin.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{admin.title}</p>
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
