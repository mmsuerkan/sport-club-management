'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  initializeMessaging, 
  requestFCMToken, 
  onMessageListener, 
  saveFCMToken,
  checkNotificationPermission,
  requestNotificationPermission
} from '@/lib/firebase/messaging';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  permission: NotificationPermission;
  token: string | null;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, body: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // İlk yükleme - permission durumunu kontrol et
    const currentPermission = checkNotificationPermission();
    setPermission(currentPermission);

    // FCM'i başlat
    initializeMessaging();

    // Eğer kullanıcı giriş yaptıysa ve izin verildiyse token al
    if (user && currentPermission === 'granted') {
      getFCMToken();
    }

    // Foreground mesajlarını dinle
    if (currentPermission === 'granted') {
      onMessageListener()
        .then((payload) => {
          console.log('Foreground message received:', payload);
          
          // Browser notification göster
          if (payload.notification) {
            showNotification(
              payload.notification.title || 'Yeni Bildirim',
              payload.notification.body || 'Yeni bir bildiriminiz var',
              {
                icon: payload.notification.image || '/icons/icon-192x192.png',
                tag: 'sport-club-notification',
                requireInteraction: true,
              }
            );
          }
        })
        .catch((error) => {
          console.error('Error listening to foreground messages:', error);
        });
    }
  }, [user]);

  const getFCMToken = async () => {
    try {
      const fcmToken = await requestFCMToken();
      if (fcmToken && user) {
        setToken(fcmToken);
        // Token'ı Firestore'a kaydet
        await saveFCMToken(user.uid, fcmToken);
        
        // API'ye de kaydet
        await fetch('/api/notifications/tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            token: fcmToken,
            platform: 'web'
          }),
        });
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted' && user) {
        await getFCMToken();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = (
    title: string, 
    body: string, 
    options: NotificationOptions = {}
  ) => {
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sport-club-notification',
        requireInteraction: true,
        ...options,
      });
    }
  };

  const value: NotificationContextType = {
    permission,
    token,
    requestPermission,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};