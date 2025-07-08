import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

// Screens
import TrainersListScreen from '../screens/trainers/TrainersListScreen';
import TrainerAddScreen from '../screens/trainers/TrainerAddScreen';
import TrainerDetailScreen from '../screens/trainers/TrainerDetailScreen';
import TrainerEditScreen from '../screens/trainers/TrainerEditScreen';

import { COLORS } from '../constants';

interface Trainer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  specialization: string;
  experience: string;
  certification: string;
  salary: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  notes: string;
  createdAt: Date;
}

export type TrainersStackParamList = {
  TrainersList: undefined;
  TrainerAdd: undefined;
  TrainerDetail: { trainer: Trainer };
  TrainerEdit: { trainer: Trainer };
};

const Stack = createStackNavigator<TrainersStackParamList>();

const TrainersNavigator: React.FC = () => {
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
        name="TrainersList" 
        component={TrainersListScreen}
        options={{
          title: 'Antrenörler',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TrainerAdd" 
        component={TrainerAddScreen}
        options={{
          title: 'Yeni Antrenör',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TrainerDetail" 
        component={TrainerDetailScreen}
        options={{
          title: 'Antrenör Detayı',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TrainerEdit" 
        component={TrainerEditScreen}
        options={{
          title: 'Antrenör Düzenle',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default TrainersNavigator;