
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, User, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { loginTeacherByEmailPassword } from "@/lib/actions/teacher-actions";

// WARNING: Pre-filling credentials in the frontend is a major security risk
// and should NEVER be done in a production environment.
// This is for demonstration purposes only based on specific request.
const PREFILLED_EMAIL = "ssekitolekomathius@gmail.com";
const PREFILLED_PASSWORD = "+###Julian0776950554";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(PREFILLED_EMAIL);
  const [password, setPassword] = useState(PREFILLED_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic client-side validation (can be enhanced with Zod if needed)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format.");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginTeacherByEmailPassword(email, password);
      if (result.success && result.teacher && result.teacher.id && result.teacher.name) {
        const teacherIdParam = encodeURIComponent(result.teacher.id);
        const teacherNameParam = encodeURIComponent(result.teacher.name);
        // On login success, redirect to dashboard and show toast
        router.push(`/teacher/dashboard?teacherId=${teacherIdParam}&teacherName=${teacherNameParam}`);
        // Toast notification would typically be handled by a global toast context or a redirect with a message.
        // For simplicity here, it's implied by the successful navigation.
        // To add a toast, you'd typically use the useToast hook from ShadCN.
      } else {
        setError(result.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Connection failed - try again. If the issue persists, contact support.");
      console.error("Login submit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
      {/* School Branding Placeholder - Replace with actual branding elements */}
      <div className="text-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-primary mx-auto">
          <path d="M12 1.5a.75.75 0 01.75.75V6h4.5a.75.75 0 010 1.5H12v teclado.co4.5a.75.75 0 01-1.5 0V7.5H6a.75.75 0 010-1.5h4.5V2.25A.75.75 0 0112 1.5zm0 9a3 3 0 100 6 3 3 0 000-6zM5.22 15.095A6.713 6.713 0 014.5 12.75a.75.75 0 011.5 0 5.213 5.213 0 00.547 2.393.75.75 0 11-1.327.752zM18.78 15.095A6.713 6.713 0 0019.5 12.75a.75.75 0 00-1.5 0 5.213 5.213 0 01-.547 2.393.75.75 0 101.327.752z" />
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm1.5 0a8.25 8.25 0 1016.5 0 8.25 8.25 0 00-16.5 0z" clipRule="evenodd" />
        </svg>
        <h1 className="text-4xl font-headline font-bold text-primary mt-2">GradeCentral Academy</h1>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <User className="w-16 h-16 text-primary mb-3" />
          <CardTitle className="text-3xl font-headline">Teacher Login</CardTitle>
          <CardDescription>Access your marks submission portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Login
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-primary">
              Back to main portal
            </Link>
          </p>
        </CardContent>
      </Card>
       <footer className="mt-12 text-center text-foreground/60">
        <p>&copy; {new Date().getFullYear()} GradeCentral Academy. All rights reserved.</p>
        <p className="text-xs mt-1 text-red-500">DEMO ONLY: Login credentials pre-filled for demonstration. Do not use in production.</p>
      </footer>
    </main>
  );
}

