import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  branch?: string;
  createdAt: Date;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.navigate('Login' as never);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          name: data.name || data.displayName || 'İsimsiz Kullanıcı',
          email: user.email || '',
          phone: data.phone || '',
          role: data.role || 'STUDENT',
          branch: data.branch || '',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
        setEditedProfile({
          name: data.name || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        name: editedProfile.name,
        phone: editedProfile.phone,
      });

      setUserProfile(prev => prev ? {
        ...prev,
        name: editedProfile.name || prev.name,
        phone: editedProfile.phone || prev.phone,
      } : null);

      setEditMode(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Hata', 'Mevcut şifre yanlış.');
      } else {
        Alert.alert('Hata', 'Şifre değiştirilemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation will be handled by auth state listener
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: { [key: string]: string } = {
      ADMIN: 'Yönetici',
      TRAINER: 'Antrenör',
      PARENT: 'Veli',
      STUDENT: 'Öğrenci',
      admin: 'Yönetici',
      trainer: 'Antrenör',
      user: 'Kullanıcı',
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        {!editMode ? (
          <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => {
                setEditMode(false);
                setEditedProfile({
                  name: userProfile?.name,
                  phone: userProfile?.phone,
                });
              }}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveProfile} style={styles.headerButton}>
              <Ionicons name="checkmark" size={24} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.name?.charAt(0).toUpperCase() || 'K'}
            </Text>
          </View>
          <Text style={styles.userName}>{userProfile?.name}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{getRoleDisplay(userProfile?.role || '')}</Text>
          </View>
        </View>

        {/* Profile Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ad Soyad</Text>
              {editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.name}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, name: text }))}
                  placeholder="Ad Soyad"
                />
              ) : (
                <Text style={styles.infoValue}>{userProfile?.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{userProfile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Telefon</Text>
              {editMode ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.phone}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, phone: text }))}
                  placeholder="Telefon numarası"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{userProfile?.phone || 'Belirtilmemiş'}</Text>
              )}
            </View>
          </View>

          {userProfile?.branch && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Ionicons name="business-outline" size={20} color={COLORS.gray[600]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Şube</Text>
                <Text style={styles.infoValue}>{userProfile.branch}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
              <Text style={styles.infoValue}>
                {userProfile?.createdAt.toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>İşlemler</Text>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <Text style={styles.actionText}>Şifre Değiştir</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <Text style={styles.actionText}>Bildirim Ayarları</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.gray[600]} />
            </View>
            <Text style={styles.actionText}>Yardım & Destek</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şifre Değiştir</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Mevcut Şifre</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Mevcut şifrenizi girin"
              />

              <Text style={styles.inputLabel}>Yeni Şifre</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi girin"
              />

              <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi tekrar girin"
              />

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Şifreyi Değiştir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  editButton: {
    padding: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.xs,
  },
  roleChip: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  roleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  infoInput: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: 4,
  },
  actionsSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  modalForm: {
    gap: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});