import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache for verified tokens to reduce API calls
const tokenCache = new Map<string, { valid: boolean; canAccessWeb: boolean; isActive: boolean; expiresAt: number }>();

async function verifyTokenAndRole(token: string, request: NextRequest): Promise<{ valid: boolean; canAccessWeb: boolean; isActive: boolean }> {
  // Temporarily disable cache for debugging
  // const cached = tokenCache.get(token);
  // if (cached && cached.expiresAt > Date.now()) {
  //   return { valid: cached.valid, canAccessWeb: cached.canAccessWeb, isActive: cached.isActive };
  // }

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
      tokenCache.set(token, { valid: false, canAccessWeb: false, isActive: false, expiresAt: Date.now() + 5 * 60 * 1000 }); // Cache for 5 minutes
      return { valid: false, canAccessWeb: false, isActive: false };
    }

    const data = await response.json();
    
    if (data.valid) {
      // Cache valid token until it expires
      const expiresAt = data.expiresAt * 1000; // Convert to milliseconds
      const isAdmin = data.userData?.role === 'ADMIN';
      const isTrainer = data.userData?.role === 'TRAINER';
      const canAccessWeb = isAdmin || isTrainer; // Admin ve Trainer web'e erişebilir
      const isActive = data.userData?.isActive ?? true;
      tokenCache.set(token, { valid: true, canAccessWeb, isActive, expiresAt });
      return { valid: true, canAccessWeb, isActive };
    }

    tokenCache.set(token, { valid: false, canAccessWeb: false, isActive: false, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { valid: false, canAccessWeb: false, isActive: false };
  } catch (error) {
    // On error, deny access but don't cache
    return { valid: false, canAccessWeb: false, isActive: false };
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
    
    // Verify token validity and check access role
    const { valid, canAccessWeb, isActive } = await verifyTokenAndRole(token, request);
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
    
    // Only ADMIN and TRAINER roles can access web dashboard
    if (!canAccessWeb) {
      const response = NextResponse.redirect(new URL('/unauthorized', request.url));
      return response;
    }
  }
  
  // For public routes when user has tokens
  if (isPublicPath && token && authState === 'authenticated') {
    // Verify token before redirecting to dashboard
    const { valid, canAccessWeb, isActive } = await verifyTokenAndRole(token, request);
    
    if (valid && (pathname === '/login' || pathname === '/')) {
      // Check if account is active first
      if (!isActive) {
        return NextResponse.redirect(new URL('/account-disabled', request.url));
      }
      
      // Redirect ADMIN and TRAINER users to dashboard, others to unauthorized
      if (canAccessWeb) {
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