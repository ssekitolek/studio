
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { isValidUrl } from '@/lib/utils';

interface MarketingHeaderProps {
    content: WebsiteContent;
}

const navConfig = [
    { 
        title: "About",
        items: [
            { title: "Mission & Vision", href: "/mission-vision" },
            { title: "History", href: "/history" },
            { title: "Our Campus", href: "/campus" },
            { title: "Employment", href: "/employment" },
        ]
    },
    { 
        title: "Academics",
        items: [
            { title: "Academics Overview", href: "/academics" },
            { title: "Faculty", href: "/faculty" },
            { title: "College Counseling", href: "/college-counseling" },
        ]
    },
    { 
        title: "Community",
        items: [
            { title: "Student Life", href: "/student-life" },
            { title: "Clubs & Organizations", href: "/clubs" },
            { title: "School Houses", href: "/houses" },
            { title: "Parent Association", href: "/parents" },
        ]
    },
    { 
        title: "Admissions",
        items: [
            { title: "Admissions Process", href: "/admissions" },
            { title: "Tuition & Fees", href: "/tuition" },
            { title: "Visit Us", href: "/visit" },
        ]
    }
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

  const logoSrc = isValidUrl(content.logoUrl) 
    ? content.logoUrl 
    : "https://placehold.co/200x80.png";

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full transition-all duration-300",
      isScrolled ? "border-b bg-background/95 backdrop-blur-sm shadow-sm" : "border-b border-transparent"
    )}>
      <div className="container mx-auto flex h-24 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="relative h-24 w-56">
            <Image
                src={logoSrc}
                alt="School Logo"
                fill
                className="object-contain transition-opacity group-hover:opacity-80"
                data-ai-hint="school logo"
            />
           </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navConfig.map((item) => (
            <DropdownMenu key={item.title}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="data-[state=open]:bg-destructive data-[state=open]:text-destructive-foreground">{item.title} <ChevronDown className="ml-1 h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {item.items.map((subItem) => (
                        <DropdownMenuItem key={subItem.title} asChild>
                            <Link href={subItem.href}>{subItem.title}</Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>
        <div className='flex items-center gap-2'>
          <Button size="sm" asChild className="hidden md:inline-flex">
            <Link href="/contact">Contact</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className='hidden md:inline-flex data-[state=open]:bg-destructive data-[state=open]:text-destructive-foreground'>
                Portals <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Login as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/login/teacher">Teacher</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/login/dos">D.O.S.</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/login/admin">Website Admin</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-2 text-lg font-medium mt-16">
                  <Accordion type="multiple" className="w-full">
                    {navConfig.map((item) => (
                      <AccordionItem value={item.title} key={item.title}>
                        <AccordionTrigger className="text-base py-3">{item.title}</AccordionTrigger>
                        <AccordionContent className="pl-4">
                          <div className="flex flex-col gap-3">
                            {item.items.map((subItem) => (
                              <Link key={subItem.title} href={subItem.href} className="text-sm text-muted-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>
                                {subItem.title}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Link href="/contact" className="text-base py-3" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="portals">
                        <AccordionTrigger className="text-base py-3">Portals</AccordionTrigger>
                        <AccordionContent className="pl-4">
                           <div className="flex flex-col gap-3">
                                <Link href="/login/teacher" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Teacher</Link>
                                <Link href="/login/dos" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>D.O.S.</Link>
                                <Link href="/login/admin" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Website Admin</Link>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
