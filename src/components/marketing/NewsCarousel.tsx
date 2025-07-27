
'use client';

import Image from 'next/image';
import type { WebsiteContent } from '@/lib/types';
import Link from 'next/link';

interface NewsCarouselProps {
  posts: WebsiteContent['newsSection']['posts'];
}

export function NewsCarousel({ posts }: NewsCarouselProps) {
  if (!posts || posts.length === 0) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => (
        <Link 
            href="/news" 
            key={index} 
            className="group relative overflow-hidden rounded-lg shadow-lg h-[400px] block"
        >
          <Image
            src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            data-ai-hint="school news event"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white">
            <p className="text-sm text-white/80 drop-shadow-sm">{post.date}</p>
            <h3 className="mt-1 text-xl font-headline font-bold drop-shadow-md transition-colors duration-300 group-hover:text-accent">
                {post.title}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
