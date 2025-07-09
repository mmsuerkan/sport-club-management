import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Screens
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationSettingsScreen from '../screens/notifications/NotificationSettingsScreen';

import { COLORS } from '../constants';

export type NotificationStackParamList = {
  NotificationsList: undefined;
  NotificationSettings: undefined;
};

const Stack = createStackNavigator<NotificationStackParamList>();

const NotificationNavigator: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="NotificationsList" 
        component={NotificationsScreen}
        options={{
          title: 'Bildirimler',
          headerShown: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationSettings' as never)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="settings" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: 'Bildirim Ayarları',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default NotificationNavigator;