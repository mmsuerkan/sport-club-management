import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { COLORS } from '../constants';
import { MainTabParamList } from '../types';

// Tab Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import StudentsNavigator from './StudentsNavigator';
import TrainersNavigator from './TrainersNavigator';
import AttendanceNavigator from './AttendanceNavigator';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
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
      <Tab.Screen 
        name="Students" 
        component={StudentsNavigator}
        options={{ 
          title: 'Öğrenciler',
          headerShown: false 
        }}
      />
      <Tab.Screen 
        name="Trainers" 
        component={TrainersNavigator}
        options={{ 
          title: 'Antrenörler',
          headerShown: false 
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceNavigator}
        options={{ 
          title: 'Yoklama',
          headerShown: false 
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;