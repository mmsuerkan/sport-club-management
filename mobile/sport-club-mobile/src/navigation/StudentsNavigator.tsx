import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StudentsStackParamList } from '../types';
import StudentsListScreen from '../screens/students/StudentsListScreen';
import StudentDetailScreen from '../screens/students/StudentDetailScreen';
import StudentAddScreen from '../screens/students/StudentAddScreen';
import StudentEditScreen from '../screens/students/StudentEditScreen';

const Stack = createStackNavigator<StudentsStackParamList>();

const StudentsNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentsList" component={StudentsListScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentAdd" component={StudentAddScreen} />
      <Stack.Screen name="StudentEdit" component={StudentEditScreen} />
    </Stack.Navigator>
  );
};

export default StudentsNavigator;