import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';

const Stack = createStackNavigator();

const TrainersScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Antrenörler Ekranı</Text>
  </View>
);

const TrainersNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TrainerList" component={TrainersScreen} options={{ title: 'Antrenörler' }} />
    </Stack.Navigator>
  );
};

export default TrainersNavigator;