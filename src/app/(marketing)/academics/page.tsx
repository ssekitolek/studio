
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { BookMarked } from "lucide-react";

export default async function AcademicsPage() {
  const content = await getWebsiteContent();
  const { academicsPage } = content;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageHeader
        title={academicsPage.title}
        description={academicsPage.description}
        icon={BookMarked}
      />
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {academicsPage.programs.map((program, index) => (
          <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03]">
            <div className="relative h-64 w-full overflow-hidden">
              <Image
                src={program.imageUrl}
                alt={program.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                data-ai-hint={program.name.toLowerCase()}
              />
            </div>
            <CardHeader>
              <CardTitle>{program.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">{program.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
