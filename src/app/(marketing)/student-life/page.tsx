
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { HeartHandshake, Shield, Palette, BrainCircuit } from "lucide-react";
import type { ReactElement } from "react";

const iconMap: { [key: string]: ReactElement } = {
  Athletics: <Shield className="h-10 w-10 text-primary mb-4" />,
  "Arts & Music": <Palette className="h-10 w-10 text-primary mb-4" />,
  "Clubs & Organizations": <BrainCircuit className="h-10 w-10 text-primary mb-4" />,
  "Community Service": <HeartHandshake className="h-10 w-10 text-primary mb-4" />,
};

export default async function StudentLifePage() {
  const content = await getWebsiteContent();
  const { studentLifePage } = content;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageHeader
        title={studentLifePage.title}
        description={studentLifePage.description}
        icon={HeartHandshake}
      />
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {studentLifePage.features.map((feature, index) => (
          <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:scale-[1.03]">
             <div className="relative h-64 w-full overflow-hidden">
                <Image
                    src={(feature.imageUrls && feature.imageUrls.length > 0) ? feature.imageUrls[0] : "https://placehold.co/600x400.png"}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                    data-ai-hint={feature.title.toLowerCase().replace(/ & /g, " ")}
                />
            </div>
            <CardHeader className="items-center text-center pt-8">
              {iconMap[feature.title] || <BrainCircuit className="h-10 w-10 text-primary mb-4" />}
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow text-center">
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
