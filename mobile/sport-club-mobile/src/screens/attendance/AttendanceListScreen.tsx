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
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  createdAt: Date;
}

interface AttendanceSession {
  id: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  records: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalCount: number;
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

type AttendanceStackParamList = {
  AttendanceList: undefined;
  AttendanceDetail: { session: AttendanceSession };
  AttendanceTake: undefined;
  AttendanceHistory: { studentId?: string };
};

type AttendanceListNavigationProp = StackNavigationProp<AttendanceStackParamList, 'AttendanceList'>;

export default function AttendanceListScreen() {
  const navigation = useNavigation<AttendanceListNavigationProp>();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<AttendanceSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const statusMap = {
    present: { label: 'Geldi', color: COLORS.success, icon: 'checkmark-circle' },
    absent: { label: 'Gelmedi', color: COLORS.error, icon: 'close-circle' },
    late: { label: 'Geç Geldi', color: COLORS.warning, icon: 'time' },
    excused: { label: 'Mazeret', color: COLORS.info, icon: 'information-circle' },
  };

  useEffect(() => {
    // Firestore'dan yoklama kayıtlarını dinle (basit sorgu kullan)
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendanceData: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        attendanceData.push({
          id: doc.id,
          studentId: data.studentId || '',
          studentName: data.studentName || '',
          trainerId: data.trainerId || '',
          trainerName: data.trainerName || '',
          branchId: data.branchId || '',
          branchName: data.branchName || '',
          groupId: data.groupId || '',
          groupName: data.groupName || '',
          date: data.date?.toDate ? data.date.toDate() : (data.date || new Date()),
          status: data.status || 'present',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        });
      });
      setAttendanceRecords(attendanceData);
      
      // Yoklama kayıtlarını grup, tarih ve antrenöre göre grupla
      const sessions = groupAttendanceRecordsIntoSessions(attendanceData);
      setAttendanceSessions(sessions);
      setFilteredSessions(sessions);
      setLoading(false);
    });

    // Şubeleri ve grupları yükle
    loadBranchesAndGroups();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [searchQuery, selectedBranchId, selectedGroupId, selectedDate, attendanceSessions]);

  const groupAttendanceRecordsIntoSessions = (records: AttendanceRecord[]): AttendanceSession[] => {
    const sessionMap = new Map<string, AttendanceSession>();
    
    records.forEach(record => {
      // Date kontrolü
      if (!record.date) {
        console.warn('Record without date:', record);
        return;
      }
      
      // Benzersiz session key oluştur: tarih-grup-antrenör
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
      const dateKey = recordDate.toDateString();
      const sessionKey = `${dateKey}-${record.groupId}-${record.trainerId}`;
      
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          id: sessionKey,
          trainerId: record.trainerId,
          trainerName: record.trainerName,
          branchId: record.branchId,
          branchName: record.branchName,
          groupId: record.groupId,
          groupName: record.groupName,
          date: recordDate,
          records: [],
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          totalCount: 0,
        });
      }
      
      const session = sessionMap.get(sessionKey)!;
      session.records.push(record);
      session.totalCount++;
      
      // Durum sayılarını güncelle
      switch (record.status) {
        case 'present':
          session.presentCount++;
          break;
        case 'absent':
          session.absentCount++;
          break;
        case 'late':
          session.lateCount++;
          break;
        case 'excused':
          session.excusedCount++;
          break;
      }
    });
    
    // Map'i array'e çevir ve tarihe göre sırala
    return Array.from(sessionMap.values())
      .filter(session => session.date) // Date olmayan sessionları filtrele
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const loadBranchesAndGroups = async () => {
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

      // Grupları yükle
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const groupsData: Group[] = [];
      groupsSnapshot.forEach((doc) => {
        groupsData.push({
          id: doc.id,
          name: doc.data().name,
          branchId: doc.data().branchId,
        });
      });
      setGroups(groupsData);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    }
  };

  const filterSessions = () => {
    let filtered = attendanceSessions;

    // Arama filtresi
    if (searchQuery) {
      filtered = filtered.filter(
        (session) =>
          session.trainerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.groupName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Şube filtresi
    if (selectedBranchId) {
      filtered = filtered.filter((session) => session.branchId === selectedBranchId);
    }

    // Grup filtresi
    if (selectedGroupId) {
      filtered = filtered.filter((session) => session.groupId === selectedGroupId);
    }

    // Tarih filtresi
    if (selectedDate) {
      filtered = filtered.filter((session) => {
        const sessionDate = session.date.toDateString();
        const filterDate = new Date(selectedDate).toDateString();
        return sessionDate === filterDate;
      });
    }

    setFilteredSessions(filtered);
  };

  const handleDeleteSession = (session: AttendanceSession) => {
    Alert.alert(
      'Yoklama Seansını Sil',
      `${session.date.toLocaleDateString('tr-TR')} tarihli ${session.groupName} grubu yoklamasını silmek istediğinizden emin misiniz?\n\nBu işlem ${session.totalCount} öğrencinin yoklama kaydını silecektir.`,
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
              // Tüm ilgili yoklama kayıtlarını sil
              const deletePromises = session.records.map(record => 
                deleteDoc(doc(db, 'attendance', record.id))
              );
              await Promise.all(deletePromises);
              Alert.alert('Başarılı', 'Yoklama seansı başarıyla silindi.');
            } catch (error) {
              Alert.alert('Hata', 'Yoklama seansı silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBranchId('');
    setSelectedGroupId('');
    setSelectedDate('');
  };

  const getStatusData = (status: string) => {
    return statusMap[status as keyof typeof statusMap] || statusMap.present;
  };

  const renderAttendanceSession = ({ item }: { item: AttendanceSession }) => {
    const attendanceRate = item.totalCount > 0 ? Math.round((item.presentCount / item.totalCount) * 100) : 0;
    const sessionDate = item.date instanceof Date ? item.date : new Date(item.date);
    
    return (
      <TouchableOpacity
        style={styles.attendanceCard}
        onPress={() => navigation.navigate('AttendanceDetail', { 
          session: {
            ...item,
            date: item.date.toISOString(),
            records: item.records.map(record => ({
              ...record,
              date: record.date.toISOString(),
              createdAt: record.createdAt.toISOString()
            }))
          }
        })}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionDateTime}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.primary} />
            <View style={styles.dateTimeInfo}>
              <Text style={styles.sessionDate}>
                {sessionDate.toLocaleDateString('tr-TR', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.sessionTime}>
                {sessionDate.toLocaleTimeString('tr-TR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sessionInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.gray[600]} />
            <Text style={styles.infoText}>Antrenör: {item.trainerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.gray[600]} />
            <Text style={styles.infoText}>{item.branchName} - {item.groupName}</Text>
          </View>
        </View>
        
        <View style={styles.sessionStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Toplam</Text>
            <Text style={styles.statValue}>{item.totalCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Katılım</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>%{attendanceRate}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Geldi</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{item.presentCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gelmedi</Text>
            <Text style={[styles.statValue, { color: COLORS.error }]}>{item.absentCount}</Text>
          </View>
          {item.lateCount > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Geç</Text>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{item.lateCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.title}>Yoklama Kayıtları</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AttendanceTake')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Antrenör, şube, grup ara..."
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
            color={(selectedBranchId || selectedGroupId || selectedDate) ? COLORS.primary : COLORS.gray[600]} 
          />
        </TouchableOpacity>
      </View>

      {(searchQuery || selectedBranchId || selectedGroupId || selectedDate) && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {filteredSessions.length} yoklama seansı bulundu
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilterText}>Temizle</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredSessions}
        renderItem={renderAttendanceSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedBranchId || selectedGroupId || selectedDate
                ? 'Arama kriterlerine uygun yoklama seansı bulunamadı'
                : 'Henüz yoklama kaydı yok'}
            </Text>
            {!searchQuery && !selectedBranchId && !selectedGroupId && !selectedDate && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AttendanceTake')}
              >
                <Text style={styles.emptyButtonText}>İlk Yoklamayı Al</Text>
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

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Şube Filtresi */}
              <Text style={styles.filterLabel}>Şube</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !selectedBranchId && styles.filterOptionSelected,
                  ]}
                  onPress={() => setSelectedBranchId('')}
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
                    onPress={() => setSelectedBranchId(branch.id)}
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
              </View>
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
  attendanceCard: {
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
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attendanceInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  attendanceDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  trainerName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  attendanceDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  notesLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
    lineHeight: 18,
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
    marginBottom: SPACING.md,
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sessionDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateTimeInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  sessionDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
  },
  sessionInfo: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
    marginLeft: 6,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
});