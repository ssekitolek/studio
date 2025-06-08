
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserCog, User } from 'lucide-react';

export default function LandingPage() { // Renamed from LoginPage
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-headline font-bold text-primary">
          Grade<span className="text-accent">Central</span>
        </h1>
        <p className="text-xl text-foreground/80 mt-2">Streamlined Marks Management Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="items-center">
            <UserCog className="w-16 h-16 text-primary mb-3" />
            <CardTitle className="text-2xl font-headline">D.O.S. Portal</CardTitle>
            <CardDescription>Login for administrative access.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/login/dos">
                <LogIn className="mr-2 h-5 w-5" /> D.O.S. Login
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="items-center">
            <User className="w-16 h-16 text-primary mb-3" />
            <CardTitle className="text-2xl font-headline">Teacher Portal</CardTitle>
            <CardDescription>Login to manage marks and classes.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/login/teacher">
                <LogIn className="mr-2 h-5 w-5" /> Teacher Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <footer className="mt-16 text-center text-foreground/60">
        <p>&copy; {new Date().getFullYear()} GradeCentral. All rights reserved.</p>
      </footer>
    </main>
  );
}
