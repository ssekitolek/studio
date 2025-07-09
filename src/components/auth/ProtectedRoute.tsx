
'use client';

import { useAuth } from './AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole: 'admin' | 'dos' | 'teacher';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    
    if (!user) {
      // If not logged in, redirect to the correct login page
      if (pathname.startsWith('/teacher')) {
        router.replace('/login/teacher');
      } else if (pathname.startsWith('/dos')) {
        router.replace('/login/dos');
      } else if (pathname.startsWith('/admin')) {
        router.replace('/login/admin');
      } else {
        router.replace('/');
      }
      return;
    }
    
    // If logged in but role does not match
    if (role !== requiredRole) {
      // Decide where to redirect based on the user's actual role
      let redirectTo = '/'; // Default fallback
      if (role === 'teacher') redirectTo = '/teacher/dashboard';
      else if (role === 'dos') redirectTo = '/dos/dashboard';
      else if (role === 'admin') redirectTo = '/admin/dashboard';
      
      toast({
        title: "Access Denied",
        description: `You do not have permission to access the ${requiredRole} portal. Redirecting to your dashboard.`,
        variant: "destructive",
      });

      router.replace(redirectTo);
    }

  }, [user, loading, role, router, pathname, requiredRole, toast]);

  // Show loader while checking auth state or if user doesn't have the correct role yet
  if (loading || !user || role !== requiredRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If everything is fine, render the children
  return <>{children}</>;
}
