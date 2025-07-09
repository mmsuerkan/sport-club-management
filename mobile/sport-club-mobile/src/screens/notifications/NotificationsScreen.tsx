import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  requestNotificationPermissions,
  getNotificationSettings,
  cancelAllNotifications,
  scheduleLocalNotification,
} from '../../services/notifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadNotifications();
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    try {
      const settings = await getNotificationSettings();
      setNotificationsEnabled(settings.status === 'granted');
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Notifications are now loaded via context/listener
      // No need to fetch manually
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsEnabled(true);
        Alert.alert('Başarılı', 'Bildirimler açıldı');
      } else {
        Alert.alert('Hata', 'Bildirim izni reddedildi');
      }
    } else {
      setNotificationsEnabled(false);
      Alert.alert('Başarılı', 'Bildirimler kapatıldı');
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Tüm Bildirimleri Temizle',
      'Tüm bildirimleri temizlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              clearNotifications();
              Alert.alert('Başarılı', 'Tüm bildirimler temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Bildirimler temizlenirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'checkmark-circle';
      case 'TRAINING':
        return 'fitness';
      case 'PAYMENT':
        return 'card';
      case 'ANNOUNCEMENT':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return '#4CAF50';
      case 'TRAINING':
        return '#2196F3';
      case 'PAYMENT':
        return '#FF9800';
      case 'ANNOUNCEMENT':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
      ]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.notificationHeader}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.type)}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationTime}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR') : 'Şimdi'}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadIndicator} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>Bildirim Yok</Text>
      <Text style={styles.emptyStateText}>
        Henüz hiç bildirim almadınız
      </Text>
    </View>
  );

  const testNotification = async () => {
    try {
      await scheduleLocalNotification(
        'Test Bildirimi',
        'Bu bir test bildirimidir',
        { type: 'TEST' }
      );
      Alert.alert('Başarılı', 'Test bildirimi gönderildi');
    } catch (error) {
      Alert.alert('Hata', 'Test bildirimi gönderilirken hata oluştu');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAllNotifications}
          >
            <Ionicons name="trash" size={24} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Bildirimler</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      {__DEV__ && (
        <TouchableOpacity style={styles.testButton} onPress={testNotification}>
          <Text style={styles.testButtonText}>Test Bildirimi Gönder</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : undefined
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 8,
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  testButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default NotificationsScreen;