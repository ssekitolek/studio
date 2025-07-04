
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

      <footer className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4 md:px-6 py-12">
          <div>
            <h4 className="font-headline font-semibold text-lg text-primary">St. Mbaaga's College</h4>
            <p className="text-sm mt-2">Nurturing Minds, Building Futures.</p>
          </div>
          <div>
            <h5 className="font-semibold uppercase tracking-wider text-sm">Quick Links</h5>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/mission-vision" className="hover:text-primary">Mission & Vision</Link></li>
              <li><Link href="/academics" className="hover:text-primary">Academics</Link></li>
              <li><Link href="/student-life" className="hover:text-primary">Student Life</Link></li>
              <li><Link href="/admissions" className="hover:text-primary">Admissions</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold uppercase tracking-wider text-sm">Portals</h5>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/login/teacher" className="hover:text-primary">Teacher Login</Link></li>
              <li><Link href="/login/dos" className="hover:text-primary">D.O.S. Login</Link></li>
              <li><Link href="/login/admin" className="hover:text-primary">Admin Login</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold uppercase tracking-wider text-sm">Contact</h5>
            <div className="mt-4 space-y-2 text-sm">
              <p>{content.contactPage.address}</p>
              <p>{content.contactPage.email}</p>
              <p>{content.contactPage.phone}</p>
            </div>
          </div>
        </div>
        <div className="border-t py-4">
          <p className="container mx-auto text-sm text-center text-muted-foreground">&copy; {new Date().getFullYear()} St. Mbaaga's College Naddangira. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
