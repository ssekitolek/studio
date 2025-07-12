
import type { Metadata } from 'next';
import { PT_Sans, Space_Grotesk } from 'next/font/google';
import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/components/auth/AuthProvider';

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
  weight: ['400', '700'],
});

const faviconUrl = "https://i.imgur.com/lZDibio.png";

export const metadata: Metadata = {
  title: "St. Mbaaga's College Naddangira",
  description: 'Online student marks portal',
  icons: {
    icon: [
      { url: faviconUrl, type: 'image/png' },
      { url: faviconUrl, sizes: '32x32', type: 'image/png' },
      { url: faviconUrl, sizes: '16x16', type: 'image/png' },
    ],
    shortcut: [faviconUrl],
    apple: [
      { url: faviconUrl, sizes: '180x180' },
    ],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ptSans.variable} ${spaceGrotesk.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
