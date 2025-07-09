import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const doc = await adminDb.collection('notification_preferences').doc(userId).get();
    
    if (!doc.exists) {
      // Return default preferences if none exist
      const defaultPreferences = {
        general: true,
        attendance: true,
        training: true,
        payment: true,
        announcements: true,
      };
      return NextResponse.json({ preferences: defaultPreferences });
    }

    const preferences = doc.data();
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, preferences } = await request.json();

    if (!userId || !preferences) {
      return NextResponse.json({ 
        error: 'User ID and preferences are required' 
      }, { status: 400 });
    }

    await adminDb.collection('notification_preferences').doc(userId).set({
      userId,
      preferences,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}