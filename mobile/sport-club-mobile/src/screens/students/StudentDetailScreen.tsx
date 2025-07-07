import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { StudentsStackParamList } from '../../types';

type StudentDetailRouteProp = RouteProp<StudentsStackParamList, 'StudentDetail'>;

const StudentDetailScreen: React.FC = () => {
  const route = useRoute<StudentDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<StudentsStackParamList>>();
  const { student } = route.params;

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Hata', 'Telefon araması yapılamıyor');
    });
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Hata', 'E-posta gönderilemedi');
    });
  };

  const InfoRow = ({ icon, label, value, onPress }: { 
    icon: string; 
    label: string; 
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.infoRow} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.infoLabel}>
        <Ionicons name={icon as any} size={20} color={COLORS.gray[500]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, onPress && styles.linkValue]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Öğrenci Detayları</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('StudentEdit', { student })}
        >
          <Ionicons name="pencil" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {student.fullName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text style={styles.studentName}>{student.fullName}</Text>
          <Text style={styles.studentGroup}>{student.branchName} - {student.groupName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          <View style={styles.card}>
            <InfoRow icon="calendar-outline" label="Doğum Tarihi" value={student.birthDate} />
            <InfoRow icon="card-outline" label="TC No" value={student.tcNo} />
            <InfoRow 
              icon="call-outline" 
              label="Telefon" 
              value={student.phone}
              onPress={() => handleCall(student.phone)}
            />
            <InfoRow 
              icon="mail-outline" 
              label="E-posta" 
              value={student.email}
              onPress={() => handleEmail(student.email)}
            />
            <InfoRow icon="home-outline" label="Adres" value={student.address} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veli Bilgileri</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Veli Adı" value={student.parentName} />
            <InfoRow 
              icon="call-outline" 
              label="Veli Telefon" 
              value={student.parentPhone}
              onPress={() => handleCall(student.parentPhone)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acil Durum</Text>
          <View style={styles.card}>
            <InfoRow icon="warning-outline" label="Acil İletişim" value={student.emergencyContact} />
            <InfoRow 
              icon="call-outline" 
              label="Acil Telefon" 
              value={student.emergencyPhone}
              onPress={() => handleCall(student.emergencyPhone)}
            />
          </View>
        </View>

        {student.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{student.notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('StudentEdit', { student })}>
            <Ionicons name="pencil" size={20} color={COLORS.white} />
            <Text style={styles.editButtonText}>Düzenle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.white,
  },
  studentName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.xs,
  },
  studentGroup: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[600],
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  infoRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
    marginLeft: SPACING.sm,
  },
  value: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[900],
    marginLeft: SPACING.xl + SPACING.xs,
  },
  linkValue: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  notesText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  actionButtons: {
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});

export default StudentDetailScreen;