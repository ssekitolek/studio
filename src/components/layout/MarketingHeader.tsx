
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';


interface MarketingHeaderProps {
    content: WebsiteContent;
}

const navLinks = [
  { href: "/mission-vision", label: "About" },
  { href: "/academics", label: "Academics" },
  { href: "/student-life", label: "Community" },
  { href: "/admissions", label: "Admissions" }
];

export function MarketingHeader({ content }: MarketingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className={cn(
      "sticky top-0 z-40 w-full transition-all duration-300",
      isScrolled ? "border-b bg-background/95 backdrop-blur-sm shadow-sm" : "border-b border-transparent"
    )}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="relative h-10 w-24">
            <Image
                src={content.logoUrl}
                alt="School Logo"
                fill
                className="object-contain transition-opacity group-hover:opacity-80"
                data-ai-hint="school logo"
            />
           </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-foreground/80 hover:text-primary transition-colors">{link.label}</Link>
          ))}
        </nav>
        <div className='flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className='hidden md:inline-flex'>
                Portals <ChevronDown className="ml-1 h-4 w-4" />
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

          <Button size="sm" asChild className="hidden md:inline-flex">
            <Link href="/contact">Contact</Link>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-6 text-lg font-medium mt-16">
                    {navLinks.map(link => (
                        <Link key={link.href} href={link.href} className="text-foreground/80 hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            {link.label}
                        </Link>
                    ))}
                    <Link href="/contact" className="text-foreground/80 hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className='justify-start p-0 h-auto text-lg text-foreground/80 hover:text-primary'>
                            Portals <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>Login as</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild><Link href="/login/teacher">Teacher</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/login/dos">D.O.S.</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/login/admin">Website Admin</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
