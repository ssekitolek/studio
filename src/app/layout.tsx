
import '@/app/globals.css';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { getWebsiteContent } from '@/lib/actions/website-actions';

// This function dynamically generates metadata, including the favicon.
export async function generateMetadata(): Promise<Metadata> {
  // Fetch the dynamic content from Firestore
  const content = await getWebsiteContent();
  
  // Use the logo URL for the favicon, with a fallback to the default.
  const logoUrl = content?.logoUrl && content.logoUrl.startsWith('http') ? content.logoUrl : '/favicon.ico';

  return {
    title: "St. Mbaaga's College Naddangira",
    description: 'Online student marks portal',
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
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
