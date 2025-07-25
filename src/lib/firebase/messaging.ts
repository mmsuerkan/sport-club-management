import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import app from './config';

// FCM Messaging instance
let messaging: any = null;

// Firebase vapid key (bu değer Firebase Console'dan alınacak)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Messaging instance'ı başlat
export const initializeMessaging = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
    return messaging;
  }
  return null;
};

// FCM token al
export const requestFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      messaging = initializeMessaging();
    }
    
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Notification permission iste
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// Foreground message listener
export const onMessageListener = (): Promise<MessagePayload> => {
  return new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });
};

// FCM token'ı Firestore'a kaydet
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./config');
    
    await setDoc(doc(db, 'user_tokens', userId), {
      token,
      updatedAt: new Date(),
      platform: 'web',
    });
    
    console.log('FCM token saved successfully');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

// Notification permission durumunu kontrol et
export const checkNotificationPermission = (): string => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'default';
};

// Notification permission iste
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
};