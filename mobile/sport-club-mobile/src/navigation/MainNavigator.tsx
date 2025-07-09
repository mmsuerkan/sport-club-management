import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { MainTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { canManageStudents, canManageTrainers, canTakeAttendance, UserRole } from '../lib/firebase/auth';

// Tab Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import StudentsNavigator from './StudentsNavigator';
import TrainersNavigator from './TrainersNavigator';
import AttendanceNavigator from './AttendanceNavigator';
import NotificationNavigator from './NotificationNavigator';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { userData } = useAuth();
  const { unreadCount } = useNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Students':
              iconName = focused ? 'school' : 'school-outline';
              break;
            case 'Trainers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              
              // Add badge for notifications
              if (route.name === 'Notifications' && unreadCount > 0) {
                return (
                  <View style={styles.iconWithBadge}>
                    <Ionicons name={iconName} size={size} color={color} />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount.toString()}
                      </Text>
                    </View>
                  </View>
                );
              }
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingBottom: 25,
          paddingTop: 12,
          height: 85,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 8,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ 
          title: 'Ana Sayfa',
          headerShown: false 
        }}
      />
      
      {/* Students tab - only for ADMIN and TRAINER */}
      {canManageStudents(userData) && (
        <Tab.Screen 
          name="Students" 
          component={StudentsNavigator}
          options={{ 
            title: 'Öğrenciler',
            headerShown: false 
          }}
        />
      )}
      
      {/* Trainers tab - only for ADMIN */}
      {canManageTrainers(userData) && (
        <Tab.Screen 
          name="Trainers" 
          component={TrainersNavigator}
          options={{ 
            title: 'Antrenörler',
            headerShown: false 
          }}
        />
      )}
      
      {/* Attendance tab - only for ADMIN and TRAINER */}
      {canTakeAttendance(userData) && (
        <Tab.Screen 
          name="Attendance" 
          component={AttendanceNavigator}
          options={{ 
            title: 'Yoklama',
            headerShown: false 
          }}
        />
      )}
      
      {/* Notifications tab - available for all users */}
      <Tab.Screen 
        name="Notifications" 
        component={NotificationNavigator}
        options={{ 
          title: 'Bildirimler',
          headerShown: false 
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profil',
          headerShown: false 
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWithBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainNavigator;