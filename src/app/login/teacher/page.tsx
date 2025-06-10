
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
import { useToast } from "@/hooks/use-toast";
import { loginTeacherByEmailPassword } from "@/lib/actions/teacher-actions";

export default function TeacherLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("ssekitoleko.mathius@gmail.com"); // Pre-fill for user convenience
  const [password, setPassword] = useState("password123"); // Pre-fill for user convenience - CHANGE THIS
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginTeacherByEmailPassword(email, password);

      if (result && typeof result === 'object') {
        if (result.success && result.teacher) {
          toast({ title: "Login Successful", description: `Welcome back, ${result.teacher.name}!` });
          // Ensure teacherId and teacherName are properly encoded for URL
          const teacherIdParam = encodeURIComponent(result.teacher.id);
          const teacherNameParam = encodeURIComponent(result.teacher.name);
          router.push(`/teacher/dashboard?teacherId=${teacherIdParam}&teacherName=${teacherNameParam}`);
        } else {
          // Display the message from the server action (e.g., "Invalid email or password")
          const messageFromServer = result.message || "Login failed. Please check your credentials.";
          setErrorMessage(messageFromServer);
          // toast({ title: "Login Failed", description: messageFromServer, variant: "destructive" });
        }
      } else {
        // This case handles if 'result' is not a valid object (e.g. server action crashed without returning JSON)
        const unexpectedErrorMsg = "An unexpected response was received from the server. Please try again.";
        setErrorMessage(unexpectedErrorMsg);
        toast({ title: "Login Error", description: unexpectedErrorMsg, variant: "destructive" });
      }
    } catch (error) {
      // This catch block is for client-side errors during the fetch/call itself,
      // not for application-level errors returned by the server action.
      console.error("Client-side login error:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred during login.";
      setErrorMessage(message);
      toast({ title: "Login Error", description: message, variant: "destructive" });
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
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
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
