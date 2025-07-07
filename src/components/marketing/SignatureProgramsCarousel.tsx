
'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import type { WebsiteContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SignatureProgramsCarouselProps {
  programs: WebsiteContent['signatureProgramsSection']['programs'];
}

export function SignatureProgramsCarousel({ programs }: SignatureProgramsCarouselProps) {
  if (!programs || programs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Main Feature Card */}
      <Link href="/academics" className="md:col-span-8 group relative overflow-hidden rounded-lg shadow-2xl h-[500px] block">
        <Image
          src={(programs[0].imageUrls && programs[0].imageUrls.length > 0) ? programs[0].imageUrls[0] : "https://placehold.co/800x500.png"}
          alt={programs[0].title}
          fill
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
          data-ai-hint={programs[0].title.toLowerCase()}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 text-white">
          <h3 className="text-3xl font-headline font-bold drop-shadow-md">{programs[0].title}</h3>
          <p className="mt-2 max-w-lg text-white/90 drop-shadow-sm">{programs[0].description}</p>
        </div>
      </Link>
      
      {/* Side Cards */}
      <div className="md:col-span-4 space-y-6">
        {programs.slice(1).map((program, index) => (
          <Link href="/academics" key={index} className="group relative overflow-hidden rounded-lg shadow-lg h-[238px] bg-card block">
            <Image
              src={(program.imageUrls && program.imageUrls.length > 0) ? program.imageUrls[0] : "https://placehold.co/400x238.png"}
              alt={program.title}
              fill
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              data-ai-hint={program.title.toLowerCase()}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 text-white">
              <h4 className="font-headline font-semibold">{program.title}</h4>
              <p className="mt-1 text-xs text-white/80 line-clamp-2">{program.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
