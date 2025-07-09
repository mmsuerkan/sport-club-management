import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Notification } from '@/types/notification';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const notificationsSnapshot = await adminDb.collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const notifications: Notification[] = [];
    
    notificationsSnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
      } as Notification);
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await adminDb.collection('notifications').doc(id).delete();
    
    // İlgili makbuzları da sil
    const receiptsSnapshot = await adminDb.collection('notification_receipts')
      .where('notificationId', '==', id)
      .get();
    
    const batch = adminDb.batch();
    receiptsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}