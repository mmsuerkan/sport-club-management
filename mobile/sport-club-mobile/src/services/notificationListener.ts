import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { showImmediateNotification } from './notifications';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: string;
  targetUsers: string[];
  targetRoles: string[];
  createdAt: Date;
  read?: boolean;
}

let unsubscribeListener: (() => void) | null = null;

export const startNotificationListener = async (
  userId: string,
  userRole: string,
  onNotificationReceived: (notification: NotificationData) => void
) => {
  try {
    // Stop existing listener if any
    if (unsubscribeListener) {
      unsubscribeListener();
    }

    // Create query for user-specific notifications (without orderBy to avoid index requirement)
    const userQuery = query(
      collection(db, 'notifications'),
      where('targetUsers', 'array-contains', userId),
      limit(50)
    );

    // Create query for role-specific notifications (without orderBy to avoid index requirement)
    const roleQuery = query(
      collection(db, 'notifications'),
      where('targetRoles', 'array-contains', userRole),
      limit(50)
    );

    let lastNotificationTime = new Date();

    // Listen to user-specific notifications
    const userUnsubscribe = onSnapshot(userQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const notification: NotificationData = {
            id: change.doc.id,
            title: data.title || 'Yeni Bildirim',
            body: data.body || 'Yeni bir bildiriminiz var',
            type: data.type || 'GENERAL',
            targetUsers: data.targetUsers || [],
            targetRoles: data.targetRoles || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            read: false,
          };

          // Only show notifications that are newer than when we started listening
          if (notification.createdAt > lastNotificationTime) {
            console.log('New notification received:', notification.title);
            onNotificationReceived(notification);
            
            // Don't show local notification since FCM push notification already shows it
            // showImmediateNotification is disabled to prevent duplicate notifications
          }
        }
      });
    }, (error) => {
      console.error('Error in user notification listener:', error);
    });

    // Listen to role-specific notifications
    const roleUnsubscribe = onSnapshot(roleQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const notification: NotificationData = {
            id: change.doc.id,
            title: data.title || 'Yeni Bildirim',
            body: data.body || 'Yeni bir bildiriminiz var',
            type: data.type || 'GENERAL',
            targetUsers: data.targetUsers || [],
            targetRoles: data.targetRoles || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            read: false,
          };

          // Only show notifications that are newer than when we started listening
          if (notification.createdAt > lastNotificationTime) {
            console.log('New role notification received:', notification.title);
            onNotificationReceived(notification);
            
            // Don't show local notification since FCM push notification already shows it
            // showImmediateNotification is disabled to prevent duplicate notifications
          }
        }
      });
    }, (error) => {
      console.error('Error in role notification listener:', error);
    });

    // Combined unsubscribe function
    unsubscribeListener = () => {
      userUnsubscribe();
      roleUnsubscribe();
    };

    console.log('Notification listener started successfully');
    return unsubscribeListener;
  } catch (error) {
    console.error('Error starting notification listener:', error);
    return null;
  }
};

export const stopNotificationListener = () => {
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
    console.log('Notification listener stopped');
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId: string, userRole: string): Promise<number> => {
  try {
    // This would need to be implemented with a proper read status tracking
    // For now, we'll return 0 as a placeholder
    return 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};