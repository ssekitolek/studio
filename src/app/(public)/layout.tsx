
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogIn, User, UserCog, ShieldCheck } from 'lucide-react';
import { getWebsiteContent } from '@/lib/actions/website-actions';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getWebsiteContent();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            {content.logoUrl && !content.logoUrl.includes('placehold.co') ? (
              <Image
                src={content.logoUrl}
                alt="St. Mbaaga's College Naddangira Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-primary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 14s1.5-2 3-2 3 2 3 2" />
                <path d="M9 8h6v6H9z" />
              </svg>
            )}
            <span className="text-xl font-headline font-bold text-primary">
              St. Mbaaga's College<span className="text-accent"> Naddangira</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/#about" className="text-muted-foreground transition-colors hover:text-primary">
              About Us
            </Link>
            <Link href="/mission-vision" className="text-muted-foreground transition-colors hover:text-primary">
              Mission & Vision
            </Link>
            <Link href="/#academics" className="text-muted-foreground transition-colors hover:text-primary">
              Academics
            </Link>
            <Link href="/#news" className="text-muted-foreground transition-colors hover:text-primary">
              News & Events
            </Link>
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/login/teacher">
                  <User className="mr-2 h-4 w-4" />
                  Teacher Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/login/dos">
                  <UserCog className="mr-2 h-4 w-4" />
                  D.O.S. Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/login/admin">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Portal
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-8">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm">&copy; {new Date().getFullYear()} St. Mbaaga's College Naddangira. All rights reserved.</p>
          <nav className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="text-sm hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="text-sm hover:text-primary">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
