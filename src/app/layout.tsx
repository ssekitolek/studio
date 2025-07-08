
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

// Statically set metadata for reliability, ensuring the favicon loads correctly.
export const metadata: Metadata = {
  title: "St. Mbaaga's College Naddangira",
  description: 'Online student marks portal',
  icons: {
    icon: "https://i.imgur.com/lZDibio.png",
    shortcut: "https://i.imgur.com/lZDibio.png",
    apple: "https://i.imgur.com/lZDibio.png",
  }
};


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
