
import { getWebsiteContent } from "@/lib/actions/website-actions";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";

export default async function ContactPage() {
  const content = await getWebsiteContent();
  const { contactPage } = content;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[40vh] w-full">
        <Image
            src={contactPage.mapImageUrl}
            alt="Map of school location"
            fill
            className="object-cover"
            data-ai-hint="map location"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
            <h1 className="text-4xl md:text-6xl font-headline font-bold">{contactPage.title}</h1>
            <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">We'd love to hear from you. Please reach out with any questions.</p>
        </div>
      </div>

      <div className="bg-secondary">
        <div className="container mx-auto px-4 md:px-6 py-16">
            <div className="max-w-4xl mx-auto bg-background p-8 md:p-12 rounded-lg shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <MapPin className="h-10 w-10 text-primary mb-4"/>
                        <h3 className="font-semibold text-xl font-headline">Our Address</h3>
                        <p className="text-muted-foreground mt-1">{contactPage.address}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Phone className="h-10 w-10 text-primary mb-4"/>
                        <h3 className="font-semibold text-xl font-headline">Call Us</h3>
                        <p className="text-muted-foreground mt-1">{contactPage.phone}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Mail className="h-10 w-10 text-primary mb-4"/>
                        <h3 className="font-semibold text-xl font-headline">Email Us</h3>
                        <p className="text-muted-foreground mt-1">{contactPage.email}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
