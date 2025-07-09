import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NotificationStats } from '@/types/notification';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const receiptsSnapshot = await adminDb.collection('notification_receipts')
      .where('notificationId', '==', notificationId)
      .get();
    
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalClicked = 0;

    receiptsSnapshot.forEach(doc => {
      const receipt = doc.data();
      totalSent++;
      
      if (receipt.status === 'delivered' || receipt.status === 'read' || receipt.status === 'clicked') {
        totalDelivered++;
      }
      
      if (receipt.status === 'read' || receipt.status === 'clicked') {
        totalRead++;
      }
      
      if (receipt.status === 'clicked') {
        totalClicked++;
      }
    });

    const stats: NotificationStats = {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
      clickRate: totalRead > 0 ? (totalClicked / totalRead) * 100 : 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}