import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/'];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);
  
  const token = request.cookies.get('auth-token')?.value;
  const authState = request.cookies.get('auth-state')?.value;
  
  // Check if user is actually authenticated (has both token and auth state)
  const isAuthenticated = !!(token && authState === 'authenticated');
  
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