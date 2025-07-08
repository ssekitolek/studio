import type { Metadata } from 'next';
import { PT_Sans, Space_Grotesk } from 'next/font/google';
import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";

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

// Remove favicon from metadata object to prevent conflicts
export const metadata: Metadata = {
  title: "St. Mbaaga's College Naddangira",
  description: 'Online student marks portal',
};

const faviconUrl = "https://i.imgur.com/lZDibio.png?v=6";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ptSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
       <head>
        <link rel="icon" href={faviconUrl} type="image/png" sizes="any" />
        <link rel="shortcut icon" href={faviconUrl} type="image/png" />
        <link rel="apple-touch-icon" href={faviconUrl} type="image/png" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
