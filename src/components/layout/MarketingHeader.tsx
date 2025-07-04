
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { WebsiteContent } from '@/lib/types';

interface MarketingHeaderProps {
    content: WebsiteContent;
}

export function MarketingHeader({ content }: MarketingHeaderProps) {
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
    <header className={cn(
      "sticky top-0 z-40 w-full transition-all duration-300",
      isScrolled ? "border-b bg-background/95 backdrop-blur-sm shadow-md" : "border-b border-transparent"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="relative h-10 w-10">
            <Image
                src={content.logoUrl}
                alt="School Logo"
                fill
                className="object-contain transition-opacity group-hover:opacity-80"
                data-ai-hint="logo"
            />
           </div>
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
          <Button size="sm" asChild className="hidden md:inline-flex bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href={content.inquireSection.buttonLink}>{content.inquireSection.buttonText}</Link>
          </Button>
           <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
