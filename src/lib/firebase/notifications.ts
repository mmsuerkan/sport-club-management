import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDoc,
  setDoc,
  deleteDoc,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { 
  Notification, 
  NotificationFormData, 
  NotificationStatus, 
  NotificationTargetType,
  UserToken,
  NotificationSetting,
  NotificationReceipt,
  NotificationStats
} from '@/types/notification';

// Bildirim oluştur
export const createNotification = async (
  notificationData: NotificationFormData,
  createdBy: string
): Promise<string> => {
  try {
    const notification: Omit<Notification, 'id'> = {
      ...notificationData,
      createdAt: new Date(),
      createdBy,
      status: notificationData.scheduledFor ? NotificationStatus.SCHEDULED : NotificationStatus.DRAFT,
      sentCount: 0,
      readCount: 0,
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Tüm bildirimleri getir
export const getNotifications = async (
  lastDoc?: DocumentSnapshot,
  limitCount: number = 20
): Promise<{ notifications: Notification[]; lastDoc?: DocumentSnapshot }> => {
  try {
    let q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
      } as Notification);
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    return {
      notifications,
      lastDoc: lastVisible
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

// Bildirim durumunu güncelle
export const updateNotificationStatus = async (
  notificationId: string,
  status: NotificationStatus,
  sentCount?: number
): Promise<void> => {
  try {
    const updates: any = { status };
    if (sentCount !== undefined) {
      updates.sentCount = sentCount;
    }

    await updateDoc(doc(db, 'notifications', notificationId), updates);
  } catch (error) {
    console.error('Error updating notification status:', error);
    throw error;
  }
};

// Kullanıcı token'ını kaydet
export const saveUserToken = async (
  userId: string,
  token: string,
  platform: 'web' | 'android' | 'ios'
): Promise<void> => {
  try {
    const userToken: UserToken = {
      userId,
      token,
      platform,
      updatedAt: new Date(),
      isActive: true,
    };

    await setDoc(doc(db, 'user_tokens', `${userId}_${platform}`), userToken);
  } catch (error) {
    console.error('Error saving user token:', error);
    throw error;
  }
};

// Hedef kullanıcıların token'larını getir
export const getTargetUserTokens = async (
  targetType: NotificationTargetType,
  targetRoles?: string[],
  targetUsers?: string[],
  targetGroups?: string[]
): Promise<UserToken[]> => {
  try {
    let userIds: string[] = [];

    switch (targetType) {
      case NotificationTargetType.ALL_USERS:
        // Tüm kullanıcıları getir
        const allUsersQuery = query(collection(db, 'users'));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        userIds = allUsersSnapshot.docs.map(doc => doc.id);
        break;

      case NotificationTargetType.SPECIFIC_ROLES:
        if (targetRoles && targetRoles.length > 0) {
          const roleUsersQuery = query(
            collection(db, 'users'),
            where('role', 'in', targetRoles)
          );
          const roleUsersSnapshot = await getDocs(roleUsersQuery);
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
          const groupUsersQuery = query(
            collection(db, 'students'),
            where('groupId', 'in', targetGroups)
          );
          const groupUsersSnapshot = await getDocs(groupUsersQuery);
          userIds = groupUsersSnapshot.docs
            .map(doc => doc.data().userId)
            .filter(userId => userId);
        }
        break;
    }

    // Token'ları getir
    const tokens: UserToken[] = [];
    
    for (const userId of userIds) {
      const userTokensQuery = query(
        collection(db, 'user_tokens'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      const userTokensSnapshot = await getDocs(userTokensQuery);
      
      userTokensSnapshot.forEach(doc => {
        tokens.push({
          ...doc.data(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as UserToken);
      });
    }

    return tokens;
  } catch (error) {
    console.error('Error getting target user tokens:', error);
    throw error;
  }
};

// Bildirim ayarlarını getir
export const getNotificationSettings = async (userId: string): Promise<NotificationSetting | null> => {
  try {
    const docRef = doc(db, 'notification_settings', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as NotificationSetting;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
};

// Bildirim ayarlarını kaydet
export const saveNotificationSettings = async (
  userId: string,
  settings: NotificationSetting
): Promise<void> => {
  try {
    await setDoc(doc(db, 'notification_settings', userId), settings);
  } catch (error) {
    console.error('Error saving notification settings:', error);
    throw error;
  }
};

// Bildirim makbuzunu kaydet
export const saveNotificationReceipt = async (
  notificationId: string,
  userId: string,
  status: 'delivered' | 'read' | 'clicked' | 'failed'
): Promise<void> => {
  try {
    const receipt: NotificationReceipt = {
      id: `${notificationId}_${userId}`,
      notificationId,
      userId,
      deliveredAt: new Date(),
      status,
    };

    if (status === 'read') {
      receipt.readAt = new Date();
    } else if (status === 'clicked') {
      receipt.clickedAt = new Date();
    }

    await setDoc(doc(db, 'notification_receipts', receipt.id), receipt);
  } catch (error) {
    console.error('Error saving notification receipt:', error);
    throw error;
  }
};

// Bildirim istatistiklerini getir
export const getNotificationStats = async (notificationId: string): Promise<NotificationStats> => {
  try {
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('notificationId', '==', notificationId)
    );
    const receiptsSnapshot = await getDocs(receiptsQuery);
    
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalClicked = 0;

    receiptsSnapshot.forEach(doc => {
      const receipt = doc.data() as NotificationReceipt;
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

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
      clickRate: totalRead > 0 ? (totalClicked / totalRead) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw error;
  }
};

// Bildirim sil
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};