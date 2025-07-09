import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';
import { 
  NotificationFormData, 
  NotificationTargetType, 
  NotificationStatus,
  UserToken
} from '@/types/notification';

export async function POST(request: NextRequest) {
  try {
    const data: NotificationFormData & { createdBy: string } = await request.json();
    
    // Bildirimi veritabanına kaydet
    const notificationRef = await adminDb.collection('notifications').add({
      ...data,
      createdAt: new Date(),
      status: NotificationStatus.SENDING,
      sentCount: 0,
      readCount: 0,
    });

    // Hedef kullanıcıları belirle
    const targetUserIds = await getTargetUserIds(
      data.targetType,
      data.targetRoles,
      data.targetUsers,
      data.targetGroups
    );

    // Kullanıcıların token'larını al
    const userTokens = await getUserTokens(targetUserIds);

    // Bildirim gönder
    let sentCount = 0;
    const messaging = getMessaging();
    
    for (const userToken of userTokens) {
      try {
        await messaging.send({
          token: userToken.token,
          notification: {
            title: data.title,
            body: data.body,
            imageUrl: data.imageUrl,
          },
          data: {
            type: data.type,
            priority: data.priority,
            actionUrl: data.actionUrl || '',
            notificationId: notificationRef.id,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'sport-club-notifications',
              priority: 'high',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        
        sentCount++;
        
        // Bildirim makbuzunu kaydet
        await adminDb.collection('notification_receipts').add({
          notificationId: notificationRef.id,
          userId: userToken.userId,
          deliveredAt: new Date(),
          status: 'delivered',
        });
        
      } catch (error) {
        console.error('Error sending notification to user:', userToken.userId, error);
        
        // Hata durumunda makbuz kaydet
        await adminDb.collection('notification_receipts').add({
          notificationId: notificationRef.id,
          userId: userToken.userId,
          deliveredAt: new Date(),
          status: 'failed',
        });
      }
    }

    // Bildirim durumunu güncelle
    await notificationRef.update({
      status: NotificationStatus.SENT,
      sentCount,
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: notificationRef.id,
      sentCount 
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Hedef kullanıcı ID'lerini al
async function getTargetUserIds(
  targetType: NotificationTargetType,
  targetRoles?: string[],
  targetUsers?: string[],
  targetGroups?: string[]
): Promise<string[]> {
  let userIds: string[] = [];

  switch (targetType) {
    case NotificationTargetType.ALL_USERS:
      const allUsersSnapshot = await adminDb.collection('users').get();
      userIds = allUsersSnapshot.docs.map(doc => doc.id);
      break;

    case NotificationTargetType.SPECIFIC_ROLES:
      if (targetRoles && targetRoles.length > 0) {
        const roleUsersSnapshot = await adminDb.collection('users')
          .where('role', 'in', targetRoles)
          .get();
        userIds = roleUsersSnapshot.docs.map(doc => doc.id);
      }
      break;

    case NotificationTargetType.SPECIFIC_USERS:
      if (targetUsers && targetUsers.length > 0) {
        userIds = targetUsers;
      }
      break;

    case NotificationTargetType.SPECIFIC_GROUPS:
      if (targetGroups && targetGroups.length > 0) {
        const groupUsersSnapshot = await adminDb.collection('students')
          .where('groupId', 'in', targetGroups)
          .get();
        userIds = groupUsersSnapshot.docs
          .map(doc => doc.data().userId)
          .filter(userId => userId);
      }
      break;
  }

  return userIds;
}

// Kullanıcı token'larını al
async function getUserTokens(userIds: string[]): Promise<UserToken[]> {
  const tokens: UserToken[] = [];
  
  for (const userId of userIds) {
    const userTokensSnapshot = await adminDb.collection('user_tokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();
    
    userTokensSnapshot.forEach(doc => {
      tokens.push({
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as UserToken);
    });
  }
  
  return tokens;
}