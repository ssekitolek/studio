
'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Award, Trophy, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const slideshowImages = [
  { src: "https://placehold.co/1920x1080.png", alt: "St. Mulumba House of Champions", hint: "celebration confetti gold" },
  { src: "https://placehold.co/1920x1080.png", alt: "Sports Victory", hint: "sports trophy victory" },
  { src: "https://placehold.co/1920x1080.png", alt: "MDD Performance", hint: "drama stage performance" },
];


export default function StMulumbaHousePage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slideshowImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in-up bg-secondary/30">
      {/* Hero Section */}
      <div className="relative h-[40vh] w-full flex items-center justify-center text-center text-primary-foreground overflow-hidden">
        <div
          className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slideshowImages.map((image, index) => (
            <div key={index} className="relative w-full h-full flex-shrink-0">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                priority={index === 0}
                data-ai-hint={image.hint}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative z-10 p-4">
          <div className="flex justify-center items-center gap-4 mb-4">
            <Trophy className="w-12 h-12 text-yellow-300 drop-shadow-lg" />
            <div>
                 <h1 className="text-4xl md:text-6xl font-headline font-bold text-white drop-shadow-2xl">St. Mulumba House</h1>
                 <p className="mt-2 text-xl md:text-2xl text-yellow-300/90 font-semibold">The Undisputed Champions</p>
            </div>
            <Trophy className="w-12 h-12 text-yellow-300 drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <Card className="max-w-4xl mx-auto shadow-2xl border-2 border-accent/50 -mt-24 bg-background z-20 relative">
            <CardHeader className="text-center">
                <Sparkles className="mx-auto h-10 w-10 text-accent mb-2"/>
                <CardTitle className="text-3xl font-headline text-primary">A Legacy of Victory</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">
                    St. Mulumba House has demonstrated unparalleled skill, dedication, and spirit, securing top honors in the most prestigious school competitions. We celebrate their remarkable achievements and the legacy they are building.
                </p>
            </CardContent>
        </Card>

        <Separator className="my-16" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* First Term Sports Champions */}
            <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group border-2 border-transparent hover:border-primary">
                 <div className="relative h-80 w-full overflow-hidden">
                    <Image
                    src="https://placehold.co/600x400.png"
                    alt="Sports victory celebration"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                    data-ai-hint="sports trophy celebration"
                    />
                </div>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-accent"/>
                        <CardTitle className="text-2xl font-headline text-primary">First Term Sports Champions</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Dominating the field and court, St. Mulumba House showcased exceptional athleticism and teamwork to emerge as the overall winners of the First Term sports competitions.
                    </p>
                </CardContent>
            </Card>

            {/* MDD 2025 Champions */}
             <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group border-2 border-transparent hover:border-primary">
                <div className="relative h-80 w-full overflow-hidden">
                    <Image
                    src="https://placehold.co/600x400.png"
                    alt="MDD competition performance"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                    data-ai-hint="music dance drama"
                    />
                </div>
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <Award className="h-8 w-8 text-accent"/>
                         <CardTitle className="text-2xl font-headline text-primary">MDD Champions 2025</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                       With breathtaking performances and creative brilliance, St. Mulumba House captivated the judges and audience to be crowned the winners of the Music, Dance, and Drama (MDD) festival for 2025.
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
