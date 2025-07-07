import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Spor Kulübü</Text>
        <Text style={styles.subtitle}>Yönetim Sistemi</Text>
        <ActivityIndicator 
          size="large" 
          color={COLORS.primary} 
          style={styles.loader}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.xl,
  },
  loader: {
    marginTop: SPACING.lg,
  },
});

export default SplashScreen;