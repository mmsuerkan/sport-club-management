import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return NextResponse.json({ 
      valid: true, 
      uid: decodedToken.uid,
      email: decodedToken.email 
    });
    
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
  }
}