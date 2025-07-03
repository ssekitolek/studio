
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300",
          isScrolled ? "border-b bg-background/95 backdrop-blur-sm shadow-md" : "border-b border-transparent"
        )}>
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2 group">
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
                className="h-8 w-8 text-primary transition-opacity group-hover:opacity-80"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 14s1.5-2 3-2 3 2 3 2" />
                <path d="M9 8h6v6H9z" />
              </svg>
              <span className="text-xl font-headline font-bold text-primary transition-opacity group-hover:opacity-80">
                St. Mbaaga's College
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/mission-vision" className="hover:text-primary transition-colors">Mission & Vision</Link>
              <Link href="/academics" className="hover:text-primary transition-colors">Academics</Link>
              <Link href="/student-life" className="hover:text-primary transition-colors">Student Life</Link>
              <Link href="/admissions" className="hover:text-primary transition-colors">Admissions</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </nav>
            <div className='flex items-center gap-2'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sign In <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Login as</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login/teacher">Teacher</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login/dos">D.O.S.</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login/admin">Website Admin</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className="hidden md:inline-flex bg-accent hover:bg-accent/90 text-accent-foreground">Apply Now</Button>
               <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
          </div>
        </header>

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
                <p>Naddangira, Uganda</p>
                <p>info@st-mbaaga.test</p>
                <p>+256 123 456789</p>
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
