import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

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
  date: Date | string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  createdAt: Date | string;
}

interface AttendanceSession {
  id: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date | string;
  records: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalCount: number;
}

type AttendanceStackParamList = {
  AttendanceList: undefined;
  AttendanceDetail: { session: AttendanceSession };
  AttendanceTake: undefined;
  AttendanceHistory: { studentId?: string };
};

type AttendanceDetailRouteProp = RouteProp<AttendanceStackParamList, 'AttendanceDetail'>;

export default function AttendanceDetailScreen() {
  const route = useRoute<AttendanceDetailRouteProp>();
  const navigation = useNavigation();
  const { session } = route.params;
  const [editMode, setEditMode] = useState(false);
  const [editedRecords, setEditedRecords] = useState<{[key: string]: string}>(
    session.records.reduce((acc, record) => ({
      ...acc,
      [record.id]: record.status
    }), {})
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AttendanceRecord | null>(null);

  const statusMap = {
    present: { label: 'Geldi', color: COLORS.success, icon: 'checkmark-circle' },
    absent: { label: 'Gelmedi', color: COLORS.error, icon: 'close-circle' },
    late: { label: 'Geç Geldi', color: COLORS.warning, icon: 'time' },
    excused: { label: 'Mazeret', color: COLORS.info, icon: 'information-circle' },
  };

  const getStatusData = (status: string) => {
    return statusMap[status as keyof typeof statusMap] || statusMap.present;
  };

  const handleSaveChanges = async () => {
    Alert.alert(
      'Değişiklikleri Kaydet',
      'Yoklama kayıtlarındaki değişiklikleri kaydetmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Kaydet',
          onPress: async () => {
            try {
              const updatePromises = Object.entries(editedRecords).map(([recordId, newStatus]) => {
                const originalRecord = session.records.find(r => r.id === recordId);
                if (originalRecord && originalRecord.status !== newStatus) {
                  return updateDoc(doc(db, 'attendance', recordId), {
                    status: newStatus
                  });
                }
                return Promise.resolve();
              });
              
              await Promise.all(updatePromises);
              Alert.alert('Başarılı', 'Yoklama kayıtları güncellendi.');
              setEditMode(false);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', 'Kayıtlar güncellenirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSession = () => {
    Alert.alert(
      'Yoklama Seansını Sil',
      `Bu yoklama seansını silmek istediğinizden emin misiniz?\n\nBu işlem ${session.totalCount} öğrencinin yoklama kaydını silecektir.`,
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
              const deletePromises = session.records.map(record => 
                deleteDoc(doc(db, 'attendance', record.id))
              );
              await Promise.all(deletePromises);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', 'Yoklama seansı silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = (recordId: string, newStatus: string) => {
    setEditedRecords(prev => ({
      ...prev,
      [recordId]: newStatus
    }));
  };

  const openEditModal = (record: AttendanceRecord) => {
    setSelectedStudent(record);
    setShowEditModal(true);
  };

  const sessionDate = typeof session.date === 'string' ? new Date(session.date) : session.date;
  const attendanceRate = Math.round((session.presentCount / session.totalCount) * 100);

  const renderStudentItem = ({ item }: { item: AttendanceRecord }) => {
    const currentStatus = editMode ? editedRecords[item.id] : item.status;
    const statusData = getStatusData(currentStatus);
    
    return (
      <TouchableOpacity 
        style={styles.studentCard}
        onPress={() => editMode && openEditModal(item)}
        disabled={!editMode}
      >
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.studentName}</Text>
          {item.notes && (
            <Text style={styles.studentNotes} numberOfLines={1}>{item.notes}</Text>
          )}
        </View>
        
        {editMode ? (
          <View style={styles.statusOptions}>
            {Object.entries(statusMap).map(([status, data]) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  currentStatus === status && { backgroundColor: data.color + '20' }
                ]}
                onPress={() => handleStatusChange(item.id, status)}
              >
                <Ionicons 
                  name={data.icon as any} 
                  size={20} 
                  color={currentStatus === status ? data.color : COLORS.gray[400]} 
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.studentStatusBadge, { backgroundColor: statusData.color + '20' }]}>
            <Ionicons 
              name={statusData.icon as any} 
              size={20} 
              color={statusData.color} 
            />
            <Text style={[styles.studentStatusText, { color: statusData.color }]}>
              {statusData.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Yoklama Detayı</Text>
        <View style={styles.headerActions}>
          {editMode ? (
            <>
              <TouchableOpacity 
                onPress={() => {
                  setEditMode(false);
                  setEditedRecords(
                    session.records.reduce((acc, record) => ({
                      ...acc,
                      [record.id]: record.status
                    }), {})
                  );
                }}
                style={styles.headerButton}
              >
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveChanges} style={styles.headerButton}>
                <Ionicons name="checkmark" size={24} color={COLORS.success} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setEditMode(true)} style={styles.headerButton}>
                <Ionicons name="create-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSession} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Session Info Card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionDateSection}>
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <View style={styles.sessionDateInfo}>
              <Text style={styles.sessionDayName}>
                {sessionDate.toLocaleDateString('tr-TR', { weekday: 'long' })}
              </Text>
              <Text style={styles.sessionDateText}>
                {sessionDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
              <Text style={styles.sessionTimeText}>
                {sessionDate.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>

          <View style={styles.sessionDetailsGrid}>
            <View style={styles.sessionDetailItem}>
              <Ionicons name="person" size={18} color={COLORS.gray[600]} />
              <Text style={styles.sessionDetailLabel}>Antrenör</Text>
              <Text style={styles.sessionDetailValue}>{session.trainerName}</Text>
            </View>
            <View style={styles.sessionDetailItem}>
              <Ionicons name="location" size={18} color={COLORS.gray[600]} />
              <Text style={styles.sessionDetailLabel}>Şube</Text>
              <Text style={styles.sessionDetailValue}>{session.branchName}</Text>
            </View>
            <View style={styles.sessionDetailItem}>
              <Ionicons name="people" size={18} color={COLORS.gray[600]} />
              <Text style={styles.sessionDetailLabel}>Grup</Text>
              <Text style={styles.sessionDetailValue}>{session.groupName}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContainer}
        >
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={[styles.statValue, styles.statValuePrimary]}>%{attendanceRate}</Text>
            <Text style={[styles.statLabel, styles.statLabelPrimary]}>Katılım Oranı</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={20} color={COLORS.gray[600]} />
            </View>
            <Text style={styles.statValue}>{session.totalCount}</Text>
            <Text style={styles.statLabel}>Toplam Öğrenci</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{session.presentCount}</Text>
            <Text style={styles.statLabel}>Geldi</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.error + '20' }]}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
            </View>
            <Text style={[styles.statValue, { color: COLORS.error }]}>{session.absentCount}</Text>
            <Text style={styles.statLabel}>Gelmedi</Text>
          </View>
          
          {session.lateCount > 0 && (
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <Ionicons name="time" size={20} color={COLORS.warning} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{session.lateCount}</Text>
              <Text style={styles.statLabel}>Geç Geldi</Text>
            </View>
          )}
          
          {session.excusedCount > 0 && (
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.info }]}>{session.excusedCount}</Text>
              <Text style={styles.statLabel}>Mazeretli</Text>
            </View>
          )}
        </ScrollView>

        {/* Students Section */}
        <View style={styles.studentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Öğrenci Listesi ({session.totalCount})</Text>
            {editMode && (
              <Text style={styles.editHint}>Durum değiştirmek için öğrenciye dokunun</Text>
            )}
          </View>
          
          <FlatList
            data={session.records}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Durum Seç</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            
            {selectedStudent && (
              <>
                <Text style={styles.modalStudentName}>{selectedStudent.studentName}</Text>
                
                <View style={styles.statusGrid}>
                  {Object.entries(statusMap).map(([status, data]) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.modalStatusOption,
                        editedRecords[selectedStudent.id] === status && { 
                          backgroundColor: data.color + '20',
                          borderColor: data.color 
                        }
                      ]}
                      onPress={() => {
                        handleStatusChange(selectedStudent.id, status);
                        setShowEditModal(false);
                      }}
                    >
                      <Ionicons 
                        name={data.icon as any} 
                        size={32} 
                        color={editedRecords[selectedStudent.id] === status ? data.color : COLORS.gray[400]} 
                      />
                      <Text style={[
                        styles.modalStatusLabel,
                        editedRecords[selectedStudent.id] === status && { color: data.color }
                      ]}>
                        {data.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
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
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sessionDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sessionDateInfo: {
    marginLeft: SPACING.md,
  },
  sessionDayName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[600],
    textTransform: 'capitalize',
  },
  sessionDateText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginTop: 2,
  },
  sessionTimeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    marginTop: 4,
  },
  sessionDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  sessionDetailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  sessionDetailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray[800],
    marginTop: 2,
    textAlign: 'center',
  },
  statsScrollContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardPrimary: {
    backgroundColor: COLORS.primary,
    minWidth: 120,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  statLabelPrimary: {
    color: COLORS.white,
    opacity: 0.9,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  statValuePrimary: {
    color: COLORS.white,
  },
  studentsSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  editHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  studentInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  studentName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  studentNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  studentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  studentStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statusOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: SPACING.xs,
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
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  modalStudentName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[700],
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  modalStatusOption: {
    width: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
  },
  modalStatusLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
});