
'use client';

// This component is deprecated and no longer provides protection.
// Route protection is now handled directly within each portal's layout file 
// (e.g., /src/app/admin/layout.tsx), which is a more robust and reliable approach.
// This file is kept to prevent breaking imports, but it no longer has any effect.

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
