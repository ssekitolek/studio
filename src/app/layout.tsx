
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

const faviconUrl = "https://i.imgur.com/lZDibio.png?v=4";

export const metadata: Metadata = {
  title: "St. Mbaaga's College Naddangira",
  description: 'Online student marks portal',
  icons: {
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: faviconUrl,
  }
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ptSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
