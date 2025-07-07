
'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import type { WebsiteContent } from '@/lib/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface NewsCarouselProps {
  posts: WebsiteContent['newsSection']['posts'];
}

export function NewsCarousel({ posts }: NewsCarouselProps) {
  if (!posts || posts.length === 0) return null;
  
  const featuredPost = posts[0];
  const sidePosts = posts.slice(1, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Featured Post */}
      <div className="lg:col-span-8">
        <Link href="/news" className="group block">
          <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col border-2 border-transparent hover:border-primary">
            <div className="relative h-[28rem] w-full overflow-hidden">
              <Image
                src={(featuredPost.imageUrls && featuredPost.imageUrls.length > 0) ? featuredPost.imageUrls[0] : "https://placehold.co/800x600.png"}
                alt={featuredPost.title}
                fill
                className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                data-ai-hint="school news event"
              />
            </div>
            <div className="p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">{featuredPost.date}</p>
              <h3 className="text-2xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">
                {featuredPost.title}
              </h3>
               <div className="flex items-center text-sm font-semibold text-accent mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Side Posts */}
      <div className="lg:col-span-4 flex flex-col gap-8">
        {sidePosts.map((post, index) => (
          <Link href="/news" key={index} className="group block">
            <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-row lg:flex-col border-2 border-transparent hover:border-primary">
              <div className="relative h-full w-1/3 lg:h-48 lg:w-full overflow-hidden">
                <Image
                  src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/400x300.png"}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                  data-ai-hint="school event"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-1">{post.date}</p>
                <h4 className="text-base font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent line-clamp-3">
                  {post.title}
                </h4>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
