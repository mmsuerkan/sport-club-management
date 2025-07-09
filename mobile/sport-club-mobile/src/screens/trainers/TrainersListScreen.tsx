import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { NavigationProp, useNavigation } from '@react-navigation/native';
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

interface Branch {
  id: string;
  name: string;
}

type TrainersStackParamList = {
  TrainersList: undefined;
  TrainerDetail: { trainer: Trainer };
  TrainerAdd: undefined;
  TrainerEdit: { trainer: Trainer };
};

type TrainersListNavigationProp = StackNavigationProp<TrainersStackParamList, 'TrainersList'>;

export default function TrainersListScreen() {
  const navigation = useNavigation<TrainersListNavigationProp>();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    // Firestore'dan antrenörleri dinle
    const unsubscribe = onSnapshot(collection(db, 'trainers'), (snapshot) => {
      const trainersData: Trainer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trainersData.push({
          id: doc.id,
          fullName: data.fullName || '',
          phone: data.phone || '',
          email: data.email || '',
          specialization: data.specialization || '',
          experience: data.experience || '',
          certification: data.certification || '',
          salary: data.salary || '',
          branchId: data.branchId || '',
          branchName: data.branchName || '',
          groupId: data.groupId || '',
          groupName: data.groupName || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setTrainers(trainersData);
      setFilteredTrainers(trainersData);
      setLoading(false);
    });

    // Şubeleri yükle
    loadBranches();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterTrainers();
  }, [searchQuery, selectedBranchId, trainers]);

  const loadBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      querySnapshot.forEach((doc) => {
        branchesData.push({
          id: doc.id,
          name: doc.data().name,
        });
      });
      setBranches(branchesData);
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    }
  };

  const filterTrainers = () => {
    let filtered = trainers;

    // Arama filtresi
    if (searchQuery) {
      filtered = filtered.filter(
        (trainer) =>
          trainer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trainer.phone.includes(searchQuery) ||
          trainer.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Şube filtresi
    if (selectedBranchId) {
      filtered = filtered.filter((trainer) => trainer.branchId === selectedBranchId);
    }

    setFilteredTrainers(filtered);
  };

  const handleDeleteTrainer = (trainerId: string) => {
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
              await deleteDoc(doc(db, 'trainers', trainerId));
              Alert.alert('Başarılı', 'Antrenör başarıyla silindi.');
            } catch (error) {
              Alert.alert('Hata', 'Antrenör silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBranchId('');
  };

  const renderTrainerItem = ({ item }: { item: Trainer }) => (
    <TouchableOpacity
      style={styles.trainerCard}
      onPress={() => navigation.navigate('TrainerDetail', { 
        trainer: {
          ...item,
          createdAt: item.createdAt.toISOString()
        } 
      })}
    >
      <View style={styles.trainerHeader}>
        <View style={styles.trainerAvatar}>
          <Text style={styles.avatarText}>
            {item.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2)}
          </Text>
        </View>
        <View style={styles.trainerInfo}>
          <Text style={styles.trainerName}>{item.fullName}</Text>
          <Text style={styles.trainerDetail}>{item.branchName} - {item.groupName}</Text>
          <Text style={styles.trainerSpecialization}>{item.specialization}</Text>
        </View>
        <View style={styles.trainerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEmail(item.email)}
          >
            <Ionicons name="mail" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Antrenörler</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('TrainerAdd')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Antrenör ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray[400]}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={selectedBranchId ? COLORS.primary : COLORS.gray[600]} 
          />
        </TouchableOpacity>
      </View>

      {(searchQuery || selectedBranchId) && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {filteredTrainers.length} antrenör bulundu
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilterText}>Temizle</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTrainers}
        renderItem={renderTrainerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedBranchId
                ? 'Arama kriterlerine uygun antrenör bulunamadı'
                : 'Henüz antrenör eklenmemiş'}
            </Text>
            {!searchQuery && !selectedBranchId && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('TrainerAdd')}
              >
                <Text style={styles.emptyButtonText}>İlk Antrenörü Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filtre Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Şube</Text>
            <ScrollView style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !selectedBranchId && styles.filterOptionSelected,
                ]}
                onPress={() => {
                  setSelectedBranchId('');
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !selectedBranchId && styles.filterOptionTextSelected,
                  ]}
                >
                  Tümü
                </Text>
              </TouchableOpacity>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.filterOption,
                    selectedBranchId === branch.id && styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBranchId(branch.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedBranchId === branch.id && styles.filterOptionTextSelected,
                    ]}
                  >
                    {branch.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
    paddingVertical: 8,
  },
  filterButton: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary + '10',
  },
  filterInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
  },
  clearFilterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContainer: {
    padding: SPACING.md,
  },
  trainerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  trainerDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  trainerSpecialization: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  trainerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[500],
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  filterLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  filterOptions: {
    maxHeight: 200,
  },
  filterOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  filterOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[700],
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});