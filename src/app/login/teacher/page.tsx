
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

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginTeacherByEmailPassword(email, password);
      if (result.success && result.teacher) {
        const teacherIdParam = encodeURIComponent(result.teacher.id);
        const teacherNameParam = encodeURIComponent(result.teacher.name);
        router.push(`/teacher/dashboard?teacherId=${teacherIdParam}&teacherName=${teacherNameParam}`);
      } else {
        setError(result.message || "An unknown error occurred during login.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login submit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
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
                disabled={isLoading}
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
        <p>&copy; {new Date().getFullYear()} GradeCentral. All rights reserved.</p>
      </footer>
    </main>
  );
}
