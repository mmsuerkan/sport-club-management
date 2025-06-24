import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/'];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);
  
  const token = request.cookies.get('auth-token')?.value || '';
  
  console.log('Middleware:', {
    path: request.nextUrl.pathname,
    isPublicPath,
    hasToken: !!token,
    token: token ? 'exists' : 'missing'
  });
  
  if (!isPublicPath && !token) {
    console.log('Redirecting to login - no token');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isPublicPath && token && request.nextUrl.pathname !== '/') {
    console.log('Redirecting to dashboard - has token on public path');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  console.log('No redirect needed');
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};