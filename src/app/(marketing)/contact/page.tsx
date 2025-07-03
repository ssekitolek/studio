
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";

export default async function ContactPage() {
  const content = await getWebsiteContent();
  const { contactPage } = content;

  return (
    <div className="space-y-12 pb-16">
      <div className="relative h-[40vh] w-full">
        <Image
            src={contactPage.mapImageUrl}
            alt="Map of school location"
            fill
            className="object-cover"
            data-ai-hint="map location"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10">
        <div className="bg-background p-8 md:p-12 rounded-lg shadow-2xl">
            <PageHeader
                title={contactPage.title}
                description="We'd love to hear from you. Please reach out with any questions."
                icon={Mail}
            />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <MapPin className="h-10 w-10 text-primary mb-3"/>
                    <h3 className="font-semibold text-lg">Our Address</h3>
                    <p className="text-muted-foreground">{contactPage.address}</p>
                </div>
                <div className="flex flex-col items-center">
                    <Phone className="h-10 w-10 text-primary mb-3"/>
                    <h3 className="font-semibold text-lg">Call Us</h3>
                    <p className="text-muted-foreground">{contactPage.phone}</p>
                </div>
                <div className="flex flex-col items-center">
                    <Mail className="h-10 w-10 text-primary mb-3"/>
                    <h3 className="font-semibold text-lg">Email Us</h3>
                    <p className="text-muted-foreground">{contactPage.email}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
