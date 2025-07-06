
import type { Metadata } from 'next';
import { PT_Sans, Space_Grotesk } from 'next/font/google'; // Corrected fonts
import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { isValidUrl } from '@/lib/utils';

// Corrected fonts based on user PRD
const ptSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '700'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

// This function dynamically generates metadata, including the favicon.
export async function generateMetadata(): Promise<Metadata> {
  // A safe default logo URL to use as a fallback. This is the official school logo.
  const fallbackLogoUrl = "https://i.imgur.com/lZDibio.png";
  let finalLogoUrl = fallbackLogoUrl;

  try {
    const content = await getWebsiteContent();
    // Use the logo from the database only if it's a valid, non-empty URL.
    if (content?.logoUrl && isValidUrl(content.logoUrl)) {
      finalLogoUrl = content.logoUrl;
    }
  } catch (error) {
    console.error("Failed to fetch website content for metadata, using fallback logo:", error);
    // In case of an error, we'll stick with the hardcoded fallback.
  }
  
  return {
    title: "St. Mbaaga's College Naddangira",
    description: 'Online student marks portal',
    icons: {
      icon: finalLogoUrl,
      shortcut: finalLogoUrl,
      apple: finalLogoUrl,
    }
  };
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ptSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        {/* Next.js will automatically add the favicon link from the generated metadata. */}
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
