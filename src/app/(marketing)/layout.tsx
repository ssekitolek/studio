
import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="flex items-center gap-2">
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
              <span className="text-xl font-headline font-bold text-primary">
                St. Mbaaga's College<span className="text-accent"> Naddangira</span>
              </span>
            </Link>
            <nav>
              <Link href="/login/teacher" className="text-sm font-medium text-primary hover:underline">
                Sign In
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="bg-muted text-muted-foreground py-8">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-sm">&copy; 2025 St. Mbaaga's College Naddangira. All rights reserved.</p>
          </div>
        </footer>
      </div>
  );
}
