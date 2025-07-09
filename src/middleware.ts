
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = {
  TEACHER: '/teacher',
  DOS: '/dos',
  ADMIN: '/admin',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session');

  // If no session cookie, and trying to access a protected route, redirect to the appropriate login page
  if (!sessionCookie) {
    if (pathname.startsWith(PROTECTED_ROUTES.TEACHER)) {
      return NextResponse.redirect(new URL('/login/teacher', request.url));
    }
    if (pathname.startsWith(PROTECTED_ROUTES.DOS)) {
      return NextResponse.redirect(new URL('/login/dos', request.url));
    }
    if (pathname.startsWith(PROTECTED_ROUTES.ADMIN)) {
      return NextResponse.redirect(new URL('/login/admin', request.url));
    }
  }

  // If there is a session cookie, let the request proceed.
  // In a real app with roles, you would verify the cookie here
  // and check the user's role before allowing access.
  // For now, having any session cookie grants access to its respective area.
  // The API route for login sets the cookie.

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/teacher/:path*', '/dos/:path*', '/admin/:path*'],
};
