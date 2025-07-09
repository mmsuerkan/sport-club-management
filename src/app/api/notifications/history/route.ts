import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get notifications sent to this user
    const notificationsQuery = adminDb
      .collection('notifications')
      .where('targetUsers', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const notificationsSnapshot = await notificationsQuery.get();
    
    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt?.toDate?.() || new Date(),
      read: false, // You can implement read status tracking separately
    }));

    // Also get notifications sent to user's role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.role) {
      const roleNotificationsQuery = adminDb
        .collection('notifications')
        .where('targetRoles', 'array-contains', userData.role)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      const roleNotificationsSnapshot = await roleNotificationsQuery.get();
      
      const roleNotifications = roleNotificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate?.() || new Date(),
        read: false,
      }));

      // Merge and deduplicate notifications
      const allNotifications = [...notifications, ...roleNotifications];
      const uniqueNotifications = allNotifications.filter(
        (notification, index, self) =>
          index === self.findIndex(n => n.id === notification.id)
      );

      // Sort by timestamp
      uniqueNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return NextResponse.json({ 
        notifications: uniqueNotifications.slice(0, limit),
        hasMore: uniqueNotifications.length > limit
      });
    }

    return NextResponse.json({ 
      notifications,
      hasMore: notifications.length >= limit
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}