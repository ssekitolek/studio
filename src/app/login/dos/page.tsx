
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, UserCog, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function DosLoginPage() {
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
      
      const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        let errorText = `Server responded with status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || `Failed to create session. Server response: ${JSON.stringify(errorData)}`;
        } catch (jsonError) {
          console.error("Could not parse server error response as JSON.", jsonError);
        }
        throw new Error(errorText);
      }
      
      router.push("/dos/dashboard");

    } catch (err: any) {
      let friendlyMessage = "An unexpected error occurred. Please try again later.";
       if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            friendlyMessage = "Invalid D.O.S. credentials. Please try again.";
            break;
          case 'auth/invalid-email':
            friendlyMessage = "Please enter a valid email address.";
            break;
          case 'auth/user-disabled':
            friendlyMessage = "This D.O.S. account has been disabled. Please contact the main administrator.";
            break;
          case 'auth/operation-not-allowed':
            friendlyMessage = "Login method not enabled. Please enable Email/Password sign-in in your Firebase console's Authentication settings.";
            break;
          case 'auth/invalid-api-key':
            friendlyMessage = "Connection to authentication service failed due to an invalid configuration. Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correct.";
            break;
          default:
            friendlyMessage = `An unexpected Firebase error occurred: ${err.code}. Please try again later.`;
            break;
        }
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
      console.error("D.O.S. Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <UserCog className="w-16 h-16 text-primary mb-3" />
          <CardTitle className="text-3xl font-headline">D.O.S. Login</CardTitle>
          <CardDescription>Access administrative tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder=""
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
        <p>&copy; {new Date().getFullYear()} St. Mbaaga's College Naddangira. All rights reserved.</p>
      </footer>
    </main>
  );
}
