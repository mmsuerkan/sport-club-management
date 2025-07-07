import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

const ForgotPasswordScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>Şifre Sıfırlama Ekranı</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

export default ForgotPasswordScreen;