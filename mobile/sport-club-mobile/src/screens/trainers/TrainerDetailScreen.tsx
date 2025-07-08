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
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { StackNavigationProp } from '@react-navigation/stack';

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

type TrainersStackParamList = {
  TrainersList: undefined;
  TrainerDetail: { trainer: Trainer };
  TrainerAdd: undefined;
  TrainerEdit: { trainer: Trainer };
};

type TrainerDetailRouteProp = RouteProp<TrainersStackParamList, 'TrainerDetail'>;
type TrainerDetailNavigationProp = StackNavigationProp<TrainersStackParamList, 'TrainerDetail'>;

export default function TrainerDetailScreen() {
  const route = useRoute<TrainerDetailRouteProp>();
  const navigation = useNavigation<TrainerDetailNavigationProp>();
  const { trainer } = route.params;

  const handleCall = () => {
    if (trainer.phone) {
      Linking.openURL(`tel:${trainer.phone}`);
    }
  };

  const handleEmail = () => {
    if (trainer.email) {
      Linking.openURL(`mailto:${trainer.email}`);
    }
  };

  const handleEdit = () => {
    navigation.navigate('TrainerEdit', { trainer });
  };

  const handleDelete = () => {
    Alert.alert(
      'Antrenörü Sil',
      'Bu antrenörü silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'trainers', trainer.id));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', 'Antrenör silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon as any} size={20} color={COLORS.gray[600]} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Antrenör Detayı</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {trainer.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)}
            </Text>
          </View>
          <Text style={styles.name}>{trainer.fullName}</Text>
          <Text style={styles.specialization}>{trainer.specialization}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Ara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Ionicons name="mail" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>E-posta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          <DetailRow icon="call-outline" label="Telefon" value={trainer.phone} />
          <DetailRow icon="mail-outline" label="E-posta" value={trainer.email} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çalışma Bilgileri</Text>
          <DetailRow icon="business-outline" label="Şube" value={trainer.branchName} />
          <DetailRow icon="people-outline" label="Grup" value={trainer.groupName} />
          <DetailRow icon="school-outline" label="Uzmanlık" value={trainer.specialization} />
          <DetailRow icon="time-outline" label="Deneyim" value={trainer.experience} />
          <DetailRow icon="ribbon-outline" label="Sertifika" value={trainer.certification} />
          <DetailRow icon="cash-outline" label="Maaş" value={trainer.salary ? `₺${trainer.salary}` : '-'} />
        </View>

        {trainer.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notes}>{trainer.notes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kayıt Bilgileri</Text>
          <DetailRow 
            icon="calendar-outline" 
            label="Kayıt Tarihi" 
            value={trainer.createdAt.toLocaleDateString('tr-TR')} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginLeft: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.xs,
  },
  specialization: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[600],
    marginBottom: SPACING.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  notes: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
});