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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StudentsStackParamList } from '../../types';

interface Student {
  id: string;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  tcNo: string;
  parentName: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  createdAt: Date;
}

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
}

const StudentsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<StudentsStackParamList>>();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    // Real-time listener for students
    const unsubscribeStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const studentsData: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          studentsData.push({
            id: doc.id,
            fullName: data.fullName || '',
            birthDate: data.birthDate || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            tcNo: data.tcNo || '',
            parentName: data.parentName || '',
            parentPhone: data.parentPhone || '',
            emergencyContact: data.emergencyContact || '',
            emergencyPhone: data.emergencyPhone || '',
            notes: data.notes || '',
            branchId: data.branchId || '',
            branchName: data.branchName || '',
            groupId: data.groupId || '',
            groupName: data.groupName || '',
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        
        // Sort by creation date (newest first)
        studentsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setStudents(studentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching students:', error);
        setLoading(false);
      }
    );

    // Fetch branches and groups
    fetchBranchesAndGroups();

    return () => unsubscribeStudents();
  }, []);

  useEffect(() => {
    // Filter students based on search query and filters
    let filtered = students;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone.includes(searchQuery) ||
        student.parentPhone.includes(searchQuery) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply branch filter
    if (selectedBranchId) {
      filtered = filtered.filter(student => student.branchId === selectedBranchId);
    }
    
    // Apply group filter
    if (selectedGroupId) {
      filtered = filtered.filter(student => student.groupId === selectedGroupId);
    }
    
    setFilteredStudents(filtered);
    
    // Update active filters count
    const filtersCount = (selectedBranchId ? 1 : 0) + (selectedGroupId ? 1 : 0);
    setActiveFiltersCount(filtersCount);
  }, [searchQuery, students, selectedBranchId, selectedGroupId]);
  
  const fetchBranchesAndGroups = async () => {
    try {
      // Fetch branches
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      branchesSnapshot.forEach((doc) => {
        branchesData.push({
          id: doc.id,
          name: doc.data().name
        });
      });
      setBranches(branchesData);
      
      // Fetch groups
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const groupsData: Group[] = [];
      groupsSnapshot.forEach((doc) => {
        const data = doc.data();
        groupsData.push({
          id: doc.id,
          name: data.name,
          branchId: data.branchId
        });
      });
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching branches and groups:', error);
    }
  };
  
  const clearFilters = () => {
    setSelectedBranchId('');
    setSelectedGroupId('');
    setShowFilterModal(false);
  };
  
  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const handleDelete = (student: Student) => {
    Alert.alert(
      'Öğrenciyi Sil',
      `${student.fullName} adlı öğrenciyi silmek istediğinizden emin misiniz?`,
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
              await deleteDoc(doc(db, 'students', student.id));
              Alert.alert('Başarılı', 'Öğrenci başarıyla silindi.');
            } catch (error) {
              console.error('Error deleting student:', error);
              Alert.alert('Hata', 'Öğrenci silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => navigation.navigate('StudentDetail', { student: item })}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.fullName}</Text>
          <Text style={styles.studentGroup}>
            {item.branchName} - {item.groupName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.red} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.studentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>{item.parentName} - {item.parentPhone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Öğrenciler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Öğrenciler</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('StudentAdd')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Öğrenci ara (isim, telefon, email)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray[400]}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.gray[600]} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Active Filters Display */}
      {(selectedBranchId || selectedGroupId) && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.activeFiltersContainer}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {selectedBranchId && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                Şube: {branches.find(b => b.id === selectedBranchId)?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedBranchId('')}>
                <Ionicons name="close" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
          {selectedGroupId && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                Grup: {groups.find(g => g.id === selectedGroupId)?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedGroupId('')}>
                <Ionicons name="close" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {filteredStudents.length} öğrenci bulundu
        </Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Filtreleri Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>Henüz öğrenci bulunmuyor</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Farklı bir arama deneyin' : 'Yeni öğrenci eklemek için + butonuna tıklayın'}
            </Text>
          </View>
        }
      />
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filtreler</Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text style={styles.modalApplyText}>Uygula</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Branch Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Şube</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedBranchId && styles.filterOptionActive]}
                  onPress={() => setSelectedBranchId('')}
                >
                  <Text style={[styles.filterOptionText, !selectedBranchId && styles.filterOptionTextActive]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                {branches.map(branch => (
                  <TouchableOpacity
                    key={branch.id}
                    style={[styles.filterOption, selectedBranchId === branch.id && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedBranchId(branch.id);
                      // Clear group selection if it doesn't belong to selected branch
                      if (selectedGroupId && !groups.find(g => g.id === selectedGroupId && g.branchId === branch.id)) {
                        setSelectedGroupId('');
                      }
                    }}
                  >
                    <Text style={[styles.filterOptionText, selectedBranchId === branch.id && styles.filterOptionTextActive]}>
                      {branch.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Group Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Grup</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedGroupId && styles.filterOptionActive]}
                  onPress={() => setSelectedGroupId('')}
                >
                  <Text style={[styles.filterOptionText, !selectedGroupId && styles.filterOptionTextActive]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                {groups
                  .filter(group => !selectedBranchId || group.branchId === selectedBranchId)
                  .map(group => (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.filterOption, selectedGroupId === group.id && styles.filterOptionActive]}
                      onPress={() => setSelectedGroupId(group.id)}
                    >
                      <Text style={[styles.filterOptionText, selectedGroupId === group.id && styles.filterOptionTextActive]}>
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            </View>
            
            {/* Clear All Button */}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
              <Text style={styles.clearAllButtonText}>Tüm Filtreleri Temizle</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[600],
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
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[900],
  },
  filterButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeFiltersContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  activeFiltersContent: {
    gap: SPACING.sm,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    gap: SPACING.xs,
  },
  activeFilterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  clearFiltersButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  clearFiltersText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  studentGroup: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  studentDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray[600],
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  modalCancelText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[600],
  },
  modalApplyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  filterSection: {
    marginBottom: SPACING.xl,
  },
  filterSectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.md,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
  },
  filterOptionTextActive: {
    color: COLORS.white,
  },
  clearAllButton: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  clearAllButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
});

export default StudentsListScreen;