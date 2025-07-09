import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

// Screens
import AttendanceListScreen from '../screens/attendance/AttendanceListScreen';
import AttendanceDetailScreen from '../screens/attendance/AttendanceDetailScreen';
import AttendanceTakeScreen from '../screens/attendance/AttendanceTakeScreen';

import { COLORS } from '../constants';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  createdAt: Date;
}

export type AttendanceStackParamList = {
  AttendanceList: undefined;
  AttendanceDetail: { attendance: AttendanceRecord };
  AttendanceTake: undefined;
  AttendanceHistory: { studentId?: string };
};

const Stack = createStackNavigator<AttendanceStackParamList>();

const AttendanceNavigator: React.FC = () => {
  const navigation = useNavigation();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

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
        name="AttendanceList" 
        component={AttendanceListScreen}
        options={{
          title: 'Yoklama',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AttendanceDetail" 
        component={AttendanceDetailScreen}
        options={{
          title: 'Yoklama Detayı',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AttendanceTake" 
        component={AttendanceTakeScreen}
        options={{
          title: 'Yoklama Al',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AttendanceNavigator;