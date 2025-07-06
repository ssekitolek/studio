
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import Link from 'next/link';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getWebsiteContent();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingHeader content={content} />

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-4">
                    <h4 className="font-headline font-semibold text-2xl">St. Mbaaga's College</h4>
                </div>

                <div className="md:col-span-2">
                     <h5 className="font-semibold uppercase tracking-wider text-sm">Explore</h5>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="/mission-vision" className="hover:text-accent">About Us</Link></li>
                        <li><Link href="/academics" className="hover:text-accent">Academics</Link></li>
                        <li><Link href="/student-life" className="hover:text-accent">Community</Link></li>
                        <li><Link href="/admissions" className="hover:text-accent">Admissions</Link></li>
                        <li><Link href="/contact" className="hover:text-accent">Contact</Link></li>
                    </ul>
                </div>
                 <div className="md:col-span-2">
                    <h5 className="font-semibold uppercase tracking-wider text-sm">Portals</h5>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="/login/teacher" className="hover:text-accent">Teacher Login</Link></li>
                        <li><Link href="/login/dos" className="hover:text-accent">D.O.S. Login</Link></li>
                        <li><Link href="/login/admin" className="hover:text-accent">Admin Login</Link></li>
                    </ul>
                </div>
                <div className="md:col-span-4">
                    <h5 className="font-semibold uppercase tracking-wider text-sm">Contact Us</h5>
                    <div className="mt-4 space-y-2 text-sm">
                        <p>{content.contactPage.address}</p>
                        <p>Phone: {content.contactPage.phone}</p>
                        <p>Email: {content.contactPage.email}</p>
                    </div>
                </div>
            </div>
        </div>
        <div className="border-t border-primary-foreground/20 py-6">
          <p className="container mx-auto text-sm text-center text-primary-foreground/80">&copy; {new Date().getFullYear()} St. Mbaaga's College Naddangira. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
