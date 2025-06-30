import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache for verified tokens to reduce API calls
const tokenCache = new Map<string, { valid: boolean; expiresAt: number }>();

async function verifyToken(token: string, request: NextRequest): Promise<boolean> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.valid;
  }

  try {
    // Verify token using the API route
    const verifyUrl = new URL('/api/auth/verify', request.url);
    const response = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      tokenCache.set(token, { valid: false, expiresAt: Date.now() + 5 * 60 * 1000 }); // Cache for 5 minutes
      return false;
    }

    const data = await response.json();
    
    if (data.valid) {
      // Cache valid token until it expires
      const expiresAt = data.expiresAt * 1000; // Convert to milliseconds
      tokenCache.set(token, { valid: true, expiresAt });
      return true;
    }

    tokenCache.set(token, { valid: false, expiresAt: Date.now() + 5 * 60 * 1000 });
    return false;
  } catch (error) {
    // On error, deny access but don't cache
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/', '/api'];
  const pathname = request.nextUrl.pathname;
  
  // Allow API routes to be accessed
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  const token = request.cookies.get('auth-token')?.value;
  const authState = request.cookies.get('auth-state')?.value;
  
  // For protected routes
  if (!isPublicPath) {
    // Check if basic auth cookies exist
    if (!token || authState !== 'authenticated') {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('auth-state');
      return response;
    }
    
    // Verify token validity
    const isValidToken = await verifyToken(token, request);
    if (!isValidToken) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('auth-state');
      return response;
    }
  }
  
  // For public routes when user has tokens
  if (isPublicPath && token && authState === 'authenticated') {
    // Verify token before redirecting to dashboard
    const isValidToken = await verifyToken(token, request);
    
    if (isValidToken && (pathname === '/login' || pathname === '/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // If token is invalid, clear cookies
    if (!isValidToken) {
      const response = NextResponse.next();
      response.cookies.delete('auth-token');
      response.cookies.delete('auth-state');
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};