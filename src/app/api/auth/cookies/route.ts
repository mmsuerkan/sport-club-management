import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json();
    
    if (action === 'set') {
      if (!token) {
        return NextResponse.json(
          { error: 'Token is required' },
          { status: 400 }
        );
      }

      // Verify token before setting cookies
      const decodedToken = await verifyIdToken(token);
      if (!decodedToken) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Create response with secure cookies
      const response = NextResponse.json({ success: true });
      
      // Calculate expiration (1 hour from now)
      const maxAge = 60 * 60; // 1 hour in seconds
      const expires = new Date(Date.now() + maxAge * 1000);
      
      // Set secure auth-token cookie
      response.cookies.set('auth-token', token, {
        httpOnly: false, // Client needs to read this for Firebase
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAge,
        expires: expires,
        path: '/',
      });
      
      // Set auth-state cookie
      response.cookies.set('auth-state', 'authenticated', {
        httpOnly: true, // Server-only cookie
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAge,
        expires: expires,
        path: '/',
      });

      return response;
      
    } else if (action === 'clear') {
      // Clear cookies
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('auth-token', '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        expires: new Date(0),
        path: '/',
      });
      
      response.cookies.set('auth-state', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        expires: new Date(0),
        path: '/',
      });

      return response;
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to check cookie status
export async function GET() {
  return NextResponse.json({ 
    status: 'Cookie API ready',
    actions: ['set', 'clear']
  });
}