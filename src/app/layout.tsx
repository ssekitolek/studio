
import '@/app/globals.css';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { getWebsiteContent } from '@/lib/actions/website-actions';
import { isValidUrl } from '@/lib/utils';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Next.js will automatically add the favicon link from the generated metadata. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
