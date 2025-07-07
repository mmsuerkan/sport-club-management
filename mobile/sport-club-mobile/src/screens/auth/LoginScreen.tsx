import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES, SCREEN_PADDING } from '../../constants';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ImageBackground
        source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjgxMiIgdmlld0JveD0iMCAwIDM3NSA4MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIG9wYWNpdHk9IjAuMDUiPgo8cGF0aCBkPSJNMTg3LjUgMEMxMjUuNjggMCA3NS4wNDE1IDQwLjU0NTMgNzUuMDQxNSA5MC41MjQ4VjcyMS40NzVDNzUuMDQxNSA3NzEuNDU1IDEyNS42OCA4MTIgMTg3LjUgODEyQzI0OS4zMiA4MTIgMjk5Ljk1OCA3NzEuNDU1IDI5OS45NTggNzIxLjQ3NVY5MC41MjQ4QzI5OS45NTggNDAuNTQ1MyAyNDkuMzIgMCAxODcuNSAwWiIgZmlsbD0iIzNGNzNGRiIvPgo8L2c+Cjwvc3ZnPgo=' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.overlay}>
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Text style={styles.logoIcon}>🏀</Text>
                </View>
                <View style={styles.header}>
                  <Text style={styles.title}>Spor Kulübü</Text>
                  <Text style={styles.subtitle}>Yönetim Sistemi</Text>
                  <Text style={styles.description}>Basketbol kulübünüzü dijital platformda yönetin</Text>
                </View>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.form}>
                  <Text style={styles.formTitle}>Giriş Yap</Text>
                  <Text style={styles.formSubtitle}>Hesabınıza giriş yaparak devam edin</Text>
                  
                  <Input
                    label="E-posta"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ornek@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />

                  <Input
                    label="Şifre"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Şifrenizi girin"
                    isPassword
                    style={styles.input}
                  />

                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
                  </TouchableOpacity>

                  <Button
                    title="Giriş Yap"
                    onPress={handleLogin}
                    loading={loading}
                    fullWidth
                    style={styles.loginButton}
                  />
                  
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Henüz hesabınız yok mu?</Text>
                    <TouchableOpacity>
                      <Text style={styles.registerLink}> Kayıt Olun</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: SCREEN_PADDING,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 40,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES['4xl'],
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xl,
  },
  form: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: 20,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  input: {
    marginBottom: SPACING.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
  },
  registerLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;