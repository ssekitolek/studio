
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { BookMarked } from "lucide-react";

export default async function AcademicsPage() {
  const content = await getWebsiteContent();
  const { academicsPage } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[50vh] w-full">
        <Image 
          src="https://placehold.co/1920x1080.png" 
          alt="Academics at St. Mbaaga's" 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="library books"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{academicsPage.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">{academicsPage.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {academicsPage.programs.map((program, index) => (
            <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03] border-2 border-transparent hover:border-primary">
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={(program.imageUrls && program.imageUrls.length > 0) ? program.imageUrls[0] : "https://placehold.co/600x400.png"}
                  alt={program.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                  data-ai-hint={program.name.toLowerCase()}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary">{program.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">{program.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
