
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function HousesPage() {
  const content = await getWebsiteContent();
  const { housesPage } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[30vh] w-full">
        <Image 
          src={housesPage.heroImageUrl} 
          alt={housesPage.title}
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="team flags competition"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{housesPage.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">{housesPage.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {housesPage.houses.map((house, index) => (
            <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03] border-2 border-transparent hover:border-primary">
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={(house.imageUrls && house.imageUrls.length > 0) ? house.imageUrls[0] : "https://placehold.co/600x400.png"}
                  alt={house.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                  data-ai-hint={`${house.name.toLowerCase()} logo`}
                />
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-headline text-primary flex items-center justify-center gap-2"><Shield /> {house.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow text-center flex flex-col justify-between">
                <p className="text-muted-foreground mb-4">{house.description}</p>
                {house.name === "St. Mulumba" && (
                  <Button asChild variant="destructive" className="mt-auto">
                    <Link href="/houses/st-mulumba">
                      View Achievements <ArrowRight className="ml-2 h-4 w-4"/>
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
