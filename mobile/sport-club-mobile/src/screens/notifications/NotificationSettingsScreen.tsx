import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import {
  requestNotificationPermissions,
  getNotificationSettings,
  cancelAllNotifications,
} from '../../services/notifications';

interface NotificationPreferences {
  general: boolean;
  attendance: boolean;
  training: boolean;
  payment: boolean;
  announcements: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    general: true,
    attendance: true,
    training: true,
    payment: true,
    announcements: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Bildirim izin durumunu kontrol et
      const settings = await getNotificationSettings();
      setNotificationsEnabled(settings.status === 'granted');
      
      // Skip API call in Expo Go for testing
      if (Constants.appOwnership === 'expo') {
        console.log('Skipping API call in Expo Go environment');
        return;
      }
      
      // Kullanıcı tercihlerini yükle
      const baseUrl = 'http://localhost:3000'; // Development URL
      const response = await fetch(`${baseUrl}/api/notifications/preferences?userId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      const baseUrl = 'http://localhost:3000'; // Development URL
      const response = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          preferences: newPreferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Hata', 'Tercihler kaydedilirken hata oluştu');
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsEnabled(true);
        Alert.alert('Başarılı', 'Bildirimler açıldı');
      } else {
        Alert.alert(
          'Bildirim İzni',
          'Bildirimler için izin verilmedi. Lütfen uygulama ayarlarından bildirim izni verin.',
          [
            { text: 'Tamam', style: 'default' },
            {
              text: 'Ayarlar',
              onPress: () => {
                // Uygulama ayarlarını aç
                if (Platform.OS === 'ios') {
                  // iOS için Linking.openURL('app-settings:');
                } else {
                  // Android için IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {...})
                }
              },
            },
          ]
        );
      }
    } else {
      setNotificationsEnabled(false);
      // Tüm bekleyen bildirimleri iptal et
      await cancelAllNotifications();
      Alert.alert('Başarılı', 'Bildirimler kapatıldı');
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const clearNotificationData = () => {
    Alert.alert(
      'Bildirim Verilerini Temizle',
      'Tüm bildirim geçmişi ve tercihler silinecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              const baseUrl = 'http://localhost:3000'; // Development URL
              await fetch(`${baseUrl}/api/notifications/clear`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user?.uid,
                }),
              });
              
              // Yerel bildirimleri de temizle
              await cancelAllNotifications();
              
              // Tercihleri sıfırla
              const defaultPreferences = {
                general: true,
                attendance: true,
                training: true,
                payment: true,
                announcements: true,
              };
              setPreferences(defaultPreferences);
              await savePreferences(defaultPreferences);
              
              Alert.alert('Başarılı', 'Bildirim verileri temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Veriler temizlenirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    icon, 
    disabled = false 
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingItem, disabled && styles.disabledItem]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={disabled ? '#ccc' : '#2196F3'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#f5dd4b' : '#f4f3f4'}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genel Ayarlar</Text>
          
          <SettingItem
            title="Bildirimler"
            description="Tüm bildirimler açık/kapalı"
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            icon="notifications"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirim Türleri</Text>
          
          <SettingItem
            title="Genel Bildirimler"
            description="Sistem bildirimleri ve duyurular"
            value={preferences.general}
            onValueChange={(value) => updatePreference('general', value)}
            icon="information-circle"
            disabled={!notificationsEnabled}
          />
          
          <SettingItem
            title="Yoklama Bildirimleri"
            description="Yoklama durumu ve hatırlatmalar"
            value={preferences.attendance}
            onValueChange={(value) => updatePreference('attendance', value)}
            icon="checkmark-circle"
            disabled={!notificationsEnabled}
          />
          
          <SettingItem
            title="Antrenman Bildirimleri"
            description="Antrenman programı ve değişiklikler"
            value={preferences.training}
            onValueChange={(value) => updatePreference('training', value)}
            icon="fitness"
            disabled={!notificationsEnabled}
          />
          
          <SettingItem
            title="Ödeme Bildirimleri"
            description="Ödeme durumu ve hatırlatmalar"
            value={preferences.payment}
            onValueChange={(value) => updatePreference('payment', value)}
            icon="card"
            disabled={!notificationsEnabled}
          />
          
          <SettingItem
            title="Duyuru Bildirimleri"
            description="Önemli duyurular ve haberler"
            value={preferences.announcements}
            onValueChange={(value) => updatePreference('announcements', value)}
            icon="megaphone"
            disabled={!notificationsEnabled}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={clearNotificationData}
          >
            <Ionicons name="trash" size={24} color="#FF5252" />
            <View style={styles.dangerButtonContent}>
              <Text style={styles.dangerButtonTitle}>Bildirim Verilerini Temizle</Text>
              <Text style={styles.dangerButtonDescription}>
                Tüm bildirim geçmişi ve tercihler silinir
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Bilgi</Text>
          <Text style={styles.infoText}>
            Bildirimler, spor kulübü aktiviteleri hakkında önemli güncellemeler almanızı sağlar.
          </Text>
          <Text style={styles.infoText}>
            Sistem bildirimleri her zaman aktif kalır ve kapatılamaz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  disabledText: {
    color: '#ccc',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dangerButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  dangerButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 4,
  },
  dangerButtonDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default NotificationSettingsScreen;