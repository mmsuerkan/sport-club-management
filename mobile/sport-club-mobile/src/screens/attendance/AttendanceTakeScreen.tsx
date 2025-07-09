import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

interface Student {
  id: string;
  fullName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
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

interface Trainer {
  id: string;
  fullName: string;
  branchId: string;
  branchName: string;
}

interface AttendanceItem {
  student: Student;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
}

export default function AttendanceTakeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([]);
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(-1);

  const statusOptions = [
    { key: 'present', label: 'Geldi', color: COLORS.success, icon: 'checkmark-circle' },
    { key: 'absent', label: 'Gelmedi', color: COLORS.error, icon: 'close-circle' },
    { key: 'late', label: 'Geç Geldi', color: COLORS.warning, icon: 'time' },
    { key: 'excused', label: 'Mazeret', color: COLORS.info, icon: 'information-circle' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadGroupsAndTrainers();
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (selectedGroupId) {
      loadStudents();
    }
  }, [selectedGroupId]);

  const loadInitialData = async () => {
    try {
      // Şubeleri yükle
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchesData: Branch[] = [];
      branchesSnapshot.forEach((doc) => {
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

  const loadGroupsAndTrainers = async () => {
    try {
      // Seçilen şubeye ait grupları yükle
      const groupsQuery = query(
        collection(db, 'groups'),
        where('branchId', '==', selectedBranchId)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const groupsData: Group[] = [];
      groupsSnapshot.forEach((doc) => {
        groupsData.push({
          id: doc.id,
          name: doc.data().name,
          branchId: doc.data().branchId,
        });
      });
      setGroups(groupsData);

      // Seçilen şubeye ait antrenörleri yükle
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('branchId', '==', selectedBranchId)
      );
      const trainersSnapshot = await getDocs(trainersQuery);
      const trainersData: Trainer[] = [];
      trainersSnapshot.forEach((doc) => {
        const data = doc.data();
        trainersData.push({
          id: doc.id,
          fullName: data.fullName,
          branchId: data.branchId,
          branchName: data.branchName,
        });
      });
      setTrainers(trainersData);
    } catch (error) {
      console.error('Gruplar ve antrenörler yüklenirken hata:', error);
    }
  };

  const loadStudents = async () => {
    try {
      // Seçilen gruba ait öğrencileri yükle
      const studentsQuery = query(
        collection(db, 'students'),
        where('groupId', '==', selectedGroupId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData: Student[] = [];
      studentsSnapshot.forEach((doc) => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          fullName: data.fullName,
          branchId: data.branchId,
          branchName: data.branchName,
          groupId: data.groupId,
          groupName: data.groupName,
        });
      });
      setStudents(studentsData);

      // Yoklama listesini oluştur
      const initialAttendance = studentsData.map(student => ({
        student,
        status: 'present' as const,
        notes: '',
      }));
      setAttendanceList(initialAttendance);
    } catch (error) {
      console.error('Öğrenciler yüklenirken hata:', error);
    }
  };

  const handleStatusChange = (index: number, status: string) => {
    const updatedList = [...attendanceList];
    updatedList[index].status = status as any;
    setAttendanceList(updatedList);
    setShowStatusModal(false);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updatedList = [...attendanceList];
    updatedList[index].notes = notes;
    setAttendanceList(updatedList);
  };

  const validateForm = () => {
    if (!selectedBranchId) {
      Alert.alert('Hata', 'Şube seçimi zorunludur.');
      return false;
    }
    if (!selectedGroupId) {
      Alert.alert('Hata', 'Grup seçimi zorunludur.');
      return false;
    }
    if (!selectedTrainerId) {
      Alert.alert('Hata', 'Antrenör seçimi zorunludur.');
      return false;
    }
    if (attendanceList.length === 0) {
      Alert.alert('Hata', 'Yoklama alınacak öğrenci bulunamadı.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.id === selectedBranchId);
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      const selectedTrainer = trainers.find(t => t.id === selectedTrainerId);

      // Her öğrenci için yoklama kaydı oluştur
      const promises = attendanceList.map(item => 
        addDoc(collection(db, 'attendance'), {
          studentId: item.student.id,
          studentName: item.student.fullName,
          trainerId: selectedTrainerId,
          trainerName: selectedTrainer?.fullName || '',
          branchId: selectedBranchId,
          branchName: selectedBranch?.name || '',
          groupId: selectedGroupId,
          groupName: selectedGroup?.name || '',
          date: attendanceDate,
          status: item.status,
          notes: item.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      await Promise.all(promises);

      Alert.alert('Başarılı', 'Yoklama başarıyla kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Yoklama kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusData = (status: string) => {
    return statusOptions.find(s => s.key === status) || statusOptions[0];
  };

  const renderStudentItem = ({ item, index }: { item: AttendanceItem; index: number }) => {
    const statusData = getStatusData(item.status);
    
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentHeader}>
          <Text style={styles.studentName}>{item.student.fullName}</Text>
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: statusData.color + '20' }]}
            onPress={() => {
              setSelectedStudentIndex(index);
              setShowStatusModal(true);
            }}
          >
            <Ionicons name={statusData.icon as any} size={16} color={statusData.color} />
            <Text style={[styles.statusButtonText, { color: statusData.color }]}>
              {statusData.label}
            </Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.notesInput}
          value={item.notes}
          onChangeText={(text) => handleNotesChange(index, text)}
          placeholder="Not ekle..."
          placeholderTextColor={COLORS.gray[400]}
          multiline
        />
      </View>
    );
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const selectedTrainer = trainers.find(t => t.id === selectedTrainerId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Yoklama Al</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            Kaydet
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Seçim Alanları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ders Bilgileri</Text>
          
          {/* Şube Seçimi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şube *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowBranchModal(true)}
            >
              <Text style={selectedBranchId ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedBranch?.name || 'Şube seçiniz'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Grup Seçimi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grup *</Text>
            <TouchableOpacity
              style={[styles.selector, !selectedBranchId && styles.selectorDisabled]}
              onPress={() => selectedBranchId && setShowGroupModal(true)}
              disabled={!selectedBranchId}
            >
              <Text style={selectedGroupId ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedGroup?.name || (selectedBranchId ? 'Grup seçiniz' : 'Önce şube seçiniz')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Antrenör Seçimi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Antrenör *</Text>
            <TouchableOpacity
              style={[styles.selector, !selectedBranchId && styles.selectorDisabled]}
              onPress={() => selectedBranchId && setShowTrainerModal(true)}
              disabled={!selectedBranchId}
            >
              <Text style={selectedTrainerId ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedTrainer?.fullName || (selectedBranchId ? 'Antrenör seçiniz' : 'Önce şube seçiniz')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Tarih */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarih</Text>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {attendanceDate.toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Öğrenci Listesi */}
        {attendanceList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Öğrenciler ({attendanceList.length})
            </Text>
            <FlatList
              data={attendanceList}
              renderItem={renderStudentItem}
              keyExtractor={(item, index) => `${item.student.id}-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Şube Modal */}
      <Modal
        visible={showBranchModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBranchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şube Seçin</Text>
              <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={branches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedBranchId === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBranchId(item.id);
                    setSelectedGroupId('');
                    setSelectedTrainerId('');
                    setAttendanceList([]);
                    setShowBranchModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedBranchId === item.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Grup Modal */}
      <Modal
        visible={showGroupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grup Seçin</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedGroupId === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedGroupId(item.id);
                    setShowGroupModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedGroupId === item.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Antrenör Modal */}
      <Modal
        visible={showTrainerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrainerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Antrenör Seçin</Text>
              <TouchableOpacity onPress={() => setShowTrainerModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={trainers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedTrainerId === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTrainerId(item.id);
                    setShowTrainerModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedTrainerId === item.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.fullName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Durum Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Durum Seçin</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.statusOption}
                  onPress={() => handleStatusChange(selectedStudentIndex, item.key)}
                >
                  <View style={[styles.statusOptionBadge, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.statusOptionText, { color: item.color }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  saveButton: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: COLORS.gray[400],
  },
  content: {
    flex: 1,
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
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  selectorDisabled: {
    backgroundColor: COLORS.gray[50],
  },
  selectorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  selectorPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[400],
  },
  dateContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
  },
  studentCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  studentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 6,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[800],
    minHeight: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    width: '90%',
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
  modalOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  modalOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[700],
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  statusOptionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  statusOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});