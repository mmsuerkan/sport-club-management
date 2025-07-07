import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';

const Stack = createStackNavigator();

const StudentsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Öğrenciler Ekranı</Text>
  </View>
);

const StudentsNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentList" component={StudentsScreen} options={{ title: 'Öğrenciler' }} />
    </Stack.Navigator>
  );
};

export default StudentsNavigator;