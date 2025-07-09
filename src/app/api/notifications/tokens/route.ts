import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { UserToken } from '@/types/notification';

export async function POST(request: NextRequest) {
  try {
    const { userId, token, platform }: { 
      userId: string; 
      token: string; 
      platform: 'web' | 'android' | 'ios' 
    } = await request.json();

    if (!userId || !token || !platform) {
      return NextResponse.json({ 
        error: 'User ID, token, and platform are required' 
      }, { status: 400 });
    }

    const userToken: UserToken = {
      userId,
      token,
      platform,
      updatedAt: new Date(),
      isActive: true,
    };

    // Mevcut token'ı güncelle veya yeni token ekle
    const tokenId = `${userId}_${platform}`;
    await adminDb.collection('user_tokens').doc(tokenId).set(userToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform');
    
    if (!userId || !platform) {
      return NextResponse.json({ 
        error: 'User ID and platform are required' 
      }, { status: 400 });
    }

    const tokenId = `${userId}_${platform}`;
    await adminDb.collection('user_tokens').doc(tokenId).update({
      isActive: false
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}