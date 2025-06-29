import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from './lib/firebase/admin';

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/'];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);
  
  const token = request.cookies.get('auth-token')?.value;
  
  let isAuthenticated = false;
  
  if (token) {
    try {
      // Verify the token with Firebase Admin
      await adminAuth.verifyIdToken(token);
      isAuthenticated = true;
    } catch (error) {
      console.error('Token verification failed:', error);
      isAuthenticated = false;
    }
  }
  
  // For protected routes
  if (!isPublicPath && !isAuthenticated) {
    // Clear any stale cookies
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    response.cookies.delete('auth-state');
    return response;
  }
  
  // For public routes when user is authenticated
  if (isPublicPath && isAuthenticated && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Allow access to root path even when authenticated
  if (request.nextUrl.pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};