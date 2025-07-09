
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Set session expiration to 14 days.
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    cookies().set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error("--- DETAILED SESSION LOGIN ERROR ---");
    console.error("Error Object:", error);
    if (error && typeof error === 'object') {
      console.error("Error Code:", (error as any).code);
      console.error("Error Message:", (error as any).message);
      console.error("Error Stack:", (error as any).stack);
      console.error("Full Object Keys:", Object.keys(error));
      try {
        console.error("Stringified Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error("Could not stringify the error object:", e);
      }
    }
    console.error("--- END DETAILED SESSION LOGIN ERROR ---");
    
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred during session creation.';
    return NextResponse.json({ error: `Failed to create session: ${errorMessage}` }, { status: 401 });
  }
}
