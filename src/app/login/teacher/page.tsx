
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
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

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

    if (!auth) {
        setError("Authentication service is not available. Please check your Firebase configuration in the .env file.");
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Create session cookie via API route
      const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session.");
      }
      
      router.push("/teacher/dashboard");

    } catch (err: any) {
      let friendlyMessage = "An unexpected error occurred.";
      if (err.code) { // This handles Firebase client-side auth errors
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            friendlyMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/invalid-email':
            friendlyMessage = "Please enter a valid email address.";
            break;
           case 'auth/operation-not-allowed':
            friendlyMessage = "Login method not enabled. Please enable Email/Password sign-in in your Firebase console's Authentication settings.";
            break;
           case 'auth/invalid-api-key':
            friendlyMessage = "Connection to authentication service failed due to an invalid configuration. Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correct.";
            break;
          default:
            friendlyMessage = "Login failed. Please try again later.";
            break;
        }
      } else if (err.message) { // This will now catch the detailed message from our API route
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
      console.error("Login submit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-xl mt-8">
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
                minLength={6}
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
        <p>&copy; {new Date().getFullYear()} St. Mbaaga's College Naddangira. All rights reserved.</p>
      </footer>
    </main>
  );
}
