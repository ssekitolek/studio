
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Heart, Target, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default async function MissionVisionPage() {
  const content = await getWebsiteContent();
  const { missionVisionPage } = content;
  const { coreValues } = missionVisionPage;

  return (
    <div className="bg-secondary/20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative h-[40vh] w-full flex items-center justify-center text-center text-primary-foreground animate-fade-in-up">
        <Image 
          src={missionVisionPage.heroImageUrl} 
          alt={missionVisionPage.heroTitle} 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="philosophy wisdom"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative z-10 p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-white drop-shadow-2xl">{missionVisionPage.heroTitle}</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/90 drop-shadow-lg">
            {missionVisionPage.heroDescription}
          </p>
        </div>
      </div>
      
      {/* Mission and Vision Section */}
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 space-y-20">
        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          {/* Mission Card */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <Card className="h-full transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl flex flex-col overflow-hidden border-2 border-transparent hover:border-accent">
              <div className="relative h-64 w-full">
                <Image src={missionVisionPage.missionImageUrl} alt="Our Mission" fill className="object-cover" data-ai-hint="students collaborating"/>
              </div>
              <CardHeader className="pt-6">
                <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
                  <Target className="w-8 h-8 text-accent"/> {missionVisionPage.missionTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4 text-foreground/80">
                  {missionVisionPage.missionText.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Vision Card */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <Card className="h-full transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl flex flex-col overflow-hidden border-2 border-transparent hover:border-accent">
              <div className="relative h-64 w-full">
                <Image src={missionVisionPage.visionImageUrl} alt="Our Vision" fill className="object-cover" data-ai-hint="student future"/>
              </div>
              <CardHeader className="pt-6">
                <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
                  <Eye className="w-8 h-8 text-accent"/> {missionVisionPage.visionTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="space-y-4 text-foreground/80">
                  {missionVisionPage.visionText.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="text-center pt-8 animate-fade-in-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
            <h2 className="text-4xl font-headline text-primary mb-4 flex items-center justify-center gap-3"><Heart className="w-10 h-10"/> {missionVisionPage.coreValuesTitle}</h2>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground">{missionVisionPage.coreValuesDescription}</p>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {coreValues.map((value, index) => (
                  <div 
                    key={value.title} 
                    className="p-8 bg-card rounded-lg border shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${700 + index * 150}ms`, animationFillMode: 'forwards' }}
                  >
                    <CheckCircle className="h-10 w-10 text-primary mb-4 mx-auto transition-colors duration-300 group-hover:text-accent"/>
                    <h4 className="font-headline text-xl font-semibold text-primary transition-colors duration-300 group-hover:text-accent">{value.title}</h4>
                    <p className="text-muted-foreground mt-2">{value.description}</p>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
