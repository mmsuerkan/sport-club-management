import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const batch = adminDb.batch();

    // Clear notification preferences
    const preferencesRef = adminDb.collection('notification_preferences').doc(userId);
    batch.delete(preferencesRef);

    // Clear user tokens
    const userTokensQuery = adminDb
      .collection('user_tokens')
      .where('userId', '==', userId);
    
    const userTokensSnapshot = await userTokensQuery.get();
    userTokensSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Note: We don't delete the actual notifications as they might be relevant for other users
    // Instead, we could implement a read status system or user-specific notification deletion

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing notification data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}