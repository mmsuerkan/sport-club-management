import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { startNotificationListener, stopNotificationListener, NotificationData } from '../services/notificationListener';

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Start listening for notifications when user logs in
  useEffect(() => {
    if (user && userData?.role) {
      const unsubscribe = startNotificationListener(
        user.uid,
        userData.role,
        (notification) => {
          addNotification(notification);
        }
      );

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      // Stop listener when user logs out
      stopNotificationListener();
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, userData]);

  // Update unread count when notifications change
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read);
    setUnreadCount(unreadNotifications.length);
  }, [notifications]);

  const addNotification = (notification: NotificationData) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      
      // Add new notification at the beginning
      return [notification, ...prev];
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};