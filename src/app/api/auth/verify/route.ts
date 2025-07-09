import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }
    
    const decodedToken = await verifyIdToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get user data from Firestore using Admin SDK
    let userData = null;
    try {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    
    // Return decoded token data with user data
    return NextResponse.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      expiresAt: decodedToken.exp,
      userData: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for simple health check
export async function GET() {
  return NextResponse.json({ status: 'OK' });
}