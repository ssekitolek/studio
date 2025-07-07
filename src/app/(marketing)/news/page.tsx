
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function NewsPage() {
  const content = await getWebsiteContent();
  const { newsSection } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[30vh] w-full">
        <Image 
          src="https://placehold.co/1920x1080.png" 
          alt="News at St. Mbaaga's" 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="news articles events"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{newsSection.heading}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">
            Stay connected with the latest stories, achievements, and events from our vibrant community.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsSection.posts.map((post, index) => (
            <Link 
              href="/contact" // All news posts will link to contact for now
              key={index} 
              className="group block animate-fade-in-up opacity-0"
              style={{ animationDelay: `${100 + index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col border-2 border-transparent hover:border-primary hover:scale-[1.03]">
                <div className="relative h-64 w-full overflow-hidden">
                   <Image
                    src={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : "https://placehold.co/600x400.png"}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                    data-ai-hint="school news event"
                  />
                </div>
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{post.date}</p>
                    <h3 className="text-xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center text-sm font-semibold text-accent mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
