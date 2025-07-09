import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Notification handling configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Get device push token
export const getDevicePushToken = async (): Promise<string | null> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Check if running in Expo Go
    if (Constants.appOwnership === 'expo') {
      console.log('Running in Expo Go - push notifications not supported');
      return 'expo-go-mock-token'; // Mock token for testing
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting device push token:', error);
    return 'mock-token-' + Math.random().toString(36).substr(2, 9);
  }
};

// Save token to server
export const saveTokenToServer = async (
  userId: string, 
  token: string,
  platform: 'android' | 'ios'
): Promise<void> => {
  try {
    // Skip API call in Expo Go for testing
    if (Constants.appOwnership === 'expo') {
      console.log('Skipping API call in Expo Go environment');
      return;
    }
    
    // For development, use localhost
    const baseUrl = 'http://localhost:3000'; // Development URL
    const response = await fetch(`${baseUrl}/api/notifications/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        token,
        platform,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save token to server');
    }
    
    console.log('Token saved successfully');
  } catch (error) {
    console.error('Error saving token to server:', error);
  }
};

// Schedule a local notification
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#0066cc',
      },
      trigger: trigger || null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    throw error;
  }
};

// Show immediate notification
export const showImmediateNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#0066cc',
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error showing immediate notification:', error);
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

// Get notification settings
export const getNotificationSettings = async (): Promise<Notifications.NotificationPermissionsStatus> => {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
};

// Set notification channel for Android
export const setNotificationChannelAndroid = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('sport-club-notifications', {
        name: 'Spor Kulübü Bildirimleri',
        description: 'Spor kulübü yönetim sisteminden gelen bildirimler',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066cc',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    } catch (error) {
      console.error('Error setting notification channel:', error);
    }
  }
};

// Handle notification response (when user taps on notification)
export const handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
  const { notification } = response;
  const { data } = notification.request.content;
  
  console.log('Notification tapped:', data);
  
  // Handle different notification types
  if (data?.type) {
    switch (data.type) {
      case 'ATTENDANCE':
        // Navigate to attendance screen
        break;
      case 'TRAINING':
        // Navigate to training screen
        break;
      case 'PAYMENT':
        // Navigate to payment screen
        break;
      case 'ANNOUNCEMENT':
        // Navigate to announcements screen
        break;
      default:
        // Navigate to home screen
        break;
    }
  }
};

// Setup notification listeners
export const setupNotificationListeners = () => {
  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
    // You can show a custom in-app notification here
  });

  // Handle notification response (when user taps on notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

// Initialize notification service
export const initializeNotificationService = async (userId: string): Promise<void> => {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return;
    }

    // Set up Android notification channel
    await setNotificationChannelAndroid();

    // Get device token
    const token = await getDevicePushToken();
    if (!token) {
      console.log('Could not get device push token');
      return;
    }

    // Save token to server
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await saveTokenToServer(userId, token, platform);

    // Setup listeners
    setupNotificationListeners();

    console.log('Notification service initialized successfully');
  } catch (error) {
    console.error('Error initializing notification service:', error);
  }
};