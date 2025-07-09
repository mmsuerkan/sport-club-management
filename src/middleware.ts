import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache for verified tokens to reduce API calls
const tokenCache = new Map<string, { valid: boolean; isAdmin: boolean; isActive: boolean; expiresAt: number }>();

async function verifyTokenAndRole(token: string, request: NextRequest): Promise<{ valid: boolean; isAdmin: boolean; isActive: boolean }> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { valid: cached.valid, isAdmin: cached.isAdmin, isActive: cached.isActive };
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
      tokenCache.set(token, { valid: false, isAdmin: false, isActive: false, expiresAt: Date.now() + 5 * 60 * 1000 }); // Cache for 5 minutes
      return { valid: false, isAdmin: false, isActive: false };
    }

    const data = await response.json();
    
    if (data.valid) {
      // Cache valid token until it expires
      const expiresAt = data.expiresAt * 1000; // Convert to milliseconds
      const isAdmin = data.userData?.role === 'ADMIN';
      const isActive = data.userData?.isActive ?? true;
      tokenCache.set(token, { valid: true, isAdmin, isActive, expiresAt });
      return { valid: true, isAdmin, isActive };
    }

    tokenCache.set(token, { valid: false, isAdmin: false, isActive: false, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { valid: false, isAdmin: false, isActive: false };
  } catch (error) {
    // On error, deny access but don't cache
    return { valid: false, isAdmin: false, isActive: false };
  }
}

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/', '/api'];
  const pathname = request.nextUrl.pathname;
  
  // Allow API routes to be accessed
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Skip middleware for /unauthorized and /account-disabled paths to prevent infinite loop
  if (pathname === '/unauthorized' || pathname === '/account-disabled') {
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
    
    // Verify token validity and check admin role
    const { valid, isAdmin, isActive } = await verifyTokenAndRole(token, request);
    if (!valid) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('auth-state');
      return response;
    }
    
    // Check if user account is active
    if (!isActive) {
      const response = NextResponse.redirect(new URL('/account-disabled', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('auth-state');
      return response;
    }
    
    // Only ADMIN role can access web dashboard
    if (!isAdmin) {
      const response = NextResponse.redirect(new URL('/unauthorized', request.url));
      return response;
    }
  }
  
  // For public routes when user has tokens
  if (isPublicPath && token && authState === 'authenticated') {
    // Verify token before redirecting to dashboard
    const { valid, isAdmin, isActive } = await verifyTokenAndRole(token, request);
    
    if (valid && (pathname === '/login' || pathname === '/')) {
      // Check if account is active first
      if (!isActive) {
        return NextResponse.redirect(new URL('/account-disabled', request.url));
      }
      
      // Only redirect ADMIN users to dashboard, others to unauthorized
      if (isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
    
    // If token is invalid, clear cookies
    if (!valid) {
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