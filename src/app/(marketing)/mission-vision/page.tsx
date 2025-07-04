
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card } from "@/components/ui/card";
import { Eye, Heart, Target } from 'lucide-react';
import Image from 'next/image';

export default async function MissionVisionPage() {
  const content = await getWebsiteContent();
  const { missionVisionPage } = content;
  const { coreValues } = missionVisionPage;

  return (
    <div className="animate-fade-in-up space-y-16 pb-16">
      <div className="relative h-[30vh] w-full">
        <Image 
          src={missionVisionPage.heroImageUrl} 
          alt={missionVisionPage.heroTitle} 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="philosophy wisdom"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">{missionVisionPage.heroTitle}</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">
            {missionVisionPage.heroDescription}
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-headline text-primary mb-4 flex items-center gap-3"><Target className="w-8 h-8"/> {missionVisionPage.missionTitle}</h2>
                <div className="space-y-4 text-foreground/80">
                  {missionVisionPage.missionText.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
            </div>
            <div className="relative h-80 rounded-lg overflow-hidden shadow-xl">
                 <Image src={missionVisionPage.missionImageUrl} alt="Students collaborating" fill className="object-cover" data-ai-hint="students collaborating"/>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 rounded-lg overflow-hidden shadow-xl md:order-2">
                 <Image src={missionVisionPage.visionImageUrl} alt="Student looking towards future" fill className="object-cover" data-ai-hint="student future"/>
            </div>
            <div className="md:order-1">
                <h2 className="text-3xl font-headline text-primary mb-4 flex items-center gap-3"><Eye className="w-8 h-8"/> {missionVisionPage.visionTitle}</h2>
                 <div className="space-y-4 text-foreground/80">
                  {missionVisionPage.visionText.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
            </div>
        </div>
        
        <div className="text-center">
            <h2 className="text-3xl font-headline text-primary mb-4 flex items-center justify-center gap-3"><Heart className="w-8 h-8"/> {missionVisionPage.coreValuesTitle}</h2>
            <p className="max-w-2xl mx-auto text-muted-foreground">{missionVisionPage.coreValuesDescription}</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {coreValues.map((value) => (
                <div key={value.title} className="p-6 bg-background rounded-lg border shadow-sm hover:shadow-lg transition-shadow">
                    <h4 className="font-bold text-lg text-primary">{value.title}</h4>
                    <p className="text-sm text-muted-foreground mt-2">{value.description}</p>
                </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
