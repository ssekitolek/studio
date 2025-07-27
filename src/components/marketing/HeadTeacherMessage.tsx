
'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { WebsiteContent } from '@/lib/types';
import { Quote } from 'lucide-react';

interface HeadTeacherMessageProps {
  content: WebsiteContent['headTeacherMessageSection'];
}

export function HeadTeacherMessage({ content }: HeadTeacherMessageProps) {
  if (!content) {
    return null;
  }

  return (
    <Card className="overflow-hidden shadow-lg border-2">
      <CardContent className="flex flex-col md:flex-row items-center justify-center p-0">
        <div className="relative w-full md:w-2/5 h-80 md:h-[450px]">
          <Image
            src={content.imageUrl}
            alt={content.name}
            fill
            className="object-cover"
            data-ai-hint="headteacher portrait professional"
          />
        </div>
        <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
          <Quote className="w-12 h-12 text-primary/20 mb-4" />
          <p className="text-lg text-foreground/80 leading-relaxed">
            {content.message}
          </p>
          <div className="mt-6">
            <p className="font-headline text-xl font-semibold text-primary">
              {content.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {content.title}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
