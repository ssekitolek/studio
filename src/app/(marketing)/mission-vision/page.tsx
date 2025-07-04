
import { Card } from "@/components/ui/card";
import { Eye, Heart, Target } from 'lucide-react';
import Image from 'next/image';

export default function MissionVisionPage() {
  const coreValues = [
    { title: "Integrity", description: "Upholding the highest ethical standards in all actions." },
    { title: "Excellence", description: "Striving for the best in academic and personal achievements." },
    { title: "Respect", description: "Treating all members of our community with dignity and kindness." },
    { title: "Community", description: "Fostering a sense of belonging, collaboration, and mutual support." },
    { title: "Resilience", description: "Developing the strength to overcome challenges and learn from setbacks." },
    { title: "Innovation", description: "Encouraging creative thinking and adaptability for a changing world." },
  ];

  return (
    <div className="animate-fade-in-up space-y-16 pb-16">
      <div className="relative h-[30vh] w-full">
        <Image 
          src="https://placehold.co/1920x1080.png" 
          alt="School values" 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="philosophy wisdom"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Our Guiding Principles</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">
            The foundation of St. Mbaaga's College Naddangira's identity and educational philosophy.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-headline text-primary mb-4 flex items-center gap-3"><Target className="w-8 h-8"/> Our Mission</h2>
                <div className="space-y-4 text-foreground/80">
                    <p>
                    To empower students with knowledge, skills, and values to excel in a dynamic world.
                    </p>
                    <p>
                    Our mission is to provide a comprehensive and challenging education that develops students' intellectual, social, and emotional capacities. We are committed to creating a stimulating learning environment where students are encouraged to think critically, communicate effectively, and engage with the world as responsible and compassionate global citizens. Through a blend of rigorous academics, diverse extracurricular activities, and strong community engagement, we aim to prepare each student for success in higher education and their future careers.
                    </p>
                </div>
            </div>
            <div className="relative h-80 rounded-lg overflow-hidden shadow-xl">
                 <Image src="https://placehold.co/600x400.png" alt="Students collaborating" fill className="object-cover" data-ai-hint="students collaborating"/>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 rounded-lg overflow-hidden shadow-xl md:order-2">
                 <Image src="https://placehold.co/600x400.png" alt="Student looking towards future" fill className="object-cover" data-ai-hint="student future"/>
            </div>
            <div className="md:order-1">
                <h2 className="text-3xl font-headline text-primary mb-4 flex items-center gap-3"><Eye className="w-8 h-8"/> Our Vision</h2>
                <div className="space-y-4 text-foreground/80">
                    <p>
                    To be a leading center of educational excellence, innovation, and leadership.
                    </p>
                    <p>
                    We envision a future where St. Mbaaga's College Naddangira is recognized nationally and internationally as a beacon of academic excellence and holistic development. Our graduates will be leaders and innovators who contribute positively to their communities and the world, equipped with a strong moral compass and a passion for lifelong learning. We strive to be a dynamic institution that continuously adapts to the evolving needs of society while holding firm to our timeless values.
                    </p>
                </div>
            </div>
        </div>
        
        <div className="text-center">
            <h2 className="text-3xl font-headline text-primary mb-4 flex items-center justify-center gap-3"><Heart className="w-8 h-8"/> Our Core Values</h2>
            <p className="max-w-2xl mx-auto text-muted-foreground">The principles that guide our actions and define our community.</p>
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
