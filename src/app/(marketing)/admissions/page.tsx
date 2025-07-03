
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, ArrowRight } from "lucide-react";

export default async function AdmissionsPage() {
  const content = await getWebsiteContent();
  const { admissionsPage } = content;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageHeader
        title={admissionsPage.title}
        description={admissionsPage.description}
        icon={ClipboardCheck}
      />
      <div className="mt-12 max-w-4xl mx-auto">
        <div className="space-y-8 relative border-l-2 border-primary/20 pl-8">
          {admissionsPage.process.map((item, index) => (
            <div key={index} className="relative group">
              <div className="absolute -left-[42px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg transition-transform duration-300 group-hover:scale-110">
                {item.step}
              </div>
              <h3 className="text-2xl font-headline font-semibold text-primary transition-colors duration-300 group-hover:text-accent">{item.title}</h3>
              <p className="mt-2 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
            <Button size="lg" asChild>
                <Link href={admissionsPage.formUrl}>
                    Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
