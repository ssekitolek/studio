
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem, Target, Eye, Heart } from 'lucide-react';

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
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageHeader 
        title="Our Guiding Principles"
        description="The foundation of St. Mbaaga's College Naddangira's identity and educational philosophy."
        icon={Gem}
      />
      <div className="space-y-12">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <Target className="w-12 h-12 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline text-primary">Our Mission</CardTitle>
              <CardDescription className="text-lg">To empower students with knowledge, skills, and values to excel in a dynamic world.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80">
              Our mission is to provide a comprehensive and challenging education that develops students' intellectual, social, and emotional capacities. We are committed to creating a stimulating learning environment where students are encouraged to think critically, communicate effectively, and engage with the world as responsible and compassionate global citizens. Through a blend of rigorous academics, diverse extracurricular activities, and strong community engagement, we aim to prepare each student for success in higher education and their future careers.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <Eye className="w-12 h-12 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline text-primary">Our Vision</CardTitle>
              <CardDescription className="text-lg">To be a leading center of educational excellence, innovation, and leadership.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80">
              We envision a future where St. Mbaaga's College Naddangira is recognized nationally and internationally as a beacon of academic excellence and holistic development. Our graduates will be leaders and innovators who contribute positively to their communities and the world, equipped with a strong moral compass and a passion for lifelong learning. We strive to be a dynamic institution that continuously adapts to the evolving needs of society while holding firm to our timeless values.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-primary flex items-center gap-4"><Heart className="w-8 h-8"/>Our Core Values</CardTitle>
            <CardDescription className="text-lg">The principles that guide our actions and define our community.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((value) => (
              <div key={value.title} className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-bold text-primary">{value.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{value.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
