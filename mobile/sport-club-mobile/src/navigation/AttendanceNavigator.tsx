import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';

const Stack = createStackNavigator();

const AttendanceScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Yoklama Ekranı</Text>
  </View>
);

const AttendanceNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AttendanceList" component={AttendanceScreen} options={{ title: 'Yoklama' }} />
    </Stack.Navigator>
  );
};

export default AttendanceNavigator;