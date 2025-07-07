
'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import type { WebsiteContent } from '@/lib/types';
import Link from 'next/link';

interface NewsCarouselProps {
  posts: WebsiteContent['newsSection']['posts'];
}

export function NewsCarousel({ posts }: NewsCarouselProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post, index) => (
         <Link href="/contact" key={index} className="group block">
            <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col border-2 border-transparent hover:border-primary">
              <div className="relative h-64 w-full overflow-hidden">
                 <Image
                  src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                  data-ai-hint="school news event"
                />
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <p className="text-sm text-muted-foreground mb-2">{post.date}</p>
                <h3 className="text-xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">
                  {post.title}
                </h3>
              </div>
            </Card>
        </Link>
      ))}
    </div>
  );
}
