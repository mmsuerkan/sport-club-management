import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { UserData } from '../../lib/firebase/auth';

interface TrainerDashboardProps {
  userData: UserData;
}

interface TrainerStats {
  myStudents: number;
  myGroups: number;
  todayTrainings: number;
  attendanceRate: number;
  thisWeekAttendance: number;
  pendingEvaluations: number;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <View style={[styles.statCard, { borderLeftColor: COLORS[color as keyof typeof COLORS] || COLORS.primary }]}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ userData }) => {
  const [stats, setStats] = useState<TrainerStats>({
    myStudents: 0,
    myGroups: 0,
    todayTrainings: 0,
    attendanceRate: 0,
    thisWeekAttendance: 0,
    pendingEvaluations: 0
  });
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  useEffect(() => {
    fetchTrainerStats();
  }, [userData.id]);

  const fetchTrainerStats = async () => {
    try {
      setLoading(true);
      
      // Önce kendi antrenör kaydını bul
      const trainerQuery = query(
        collection(db, 'trainers'),
        where('userId', '==', userData.id || '')
      );
      const trainerSnapshot = await getDocs(trainerQuery);
      
      if (trainerSnapshot.empty) {
        console.log('Bu antrenör hesabıyla ilişkilendirilmiş kayıt bulunamadı');
        setLoading(false);
        return;
      }
      
      const trainerData = trainerSnapshot.docs[0].data();
      const trainerId = trainerSnapshot.docs[0].id;
      
      // Kendi gruplarını bul
      const myGroupsQuery = query(
        collection(db, 'groups'),
        where('trainerId', '==', trainerId)
      );
      const myGroupsSnapshot = await getDocs(myGroupsQuery);
      const myGroups = myGroupsSnapshot.size;
      
      // Kendi öğrencilerini bul
      const myStudentsQuery = query(
        collection(db, 'students'),
        where('trainerId', '==', trainerId)
      );
      const myStudentsSnapshot = await getDocs(myStudentsQuery);
      const myStudents = myStudentsSnapshot.size;
      
      // Bugünkü antrenmanları
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const todayTrainingsQuery = query(
        collection(db, 'trainings'),
        where('trainerId', '==', trainerId),
        where('date', '==', todayString)
      );
      const todayTrainingsSnapshot = await getDocs(todayTrainingsQuery);
      const todayTrainings = todayTrainingsSnapshot.size;
      
      // Bu hafta yoklama sayısı
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const thisWeekAttendanceQuery = query(
        collection(db, 'attendance'),
        where('trainerId', '==', trainerId),
        where('date', '>=', weekStart)
      );
      const thisWeekAttendanceSnapshot = await getDocs(thisWeekAttendanceQuery);
      const thisWeekAttendance = thisWeekAttendanceSnapshot.size;
      
      // Devam oranı hesaplama (örnek)
      const attendanceRate = myStudents > 0 ? Math.round((thisWeekAttendance / myStudents) * 100) : 0;
      
      setStats({
        myStudents,
        myGroups,
        todayTrainings,
        attendanceRate,
        thisWeekAttendance,
        pendingEvaluations: 0 // Placeholder
      });
      
      // Bugünkü program
      const scheduleData = todayTrainingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTodaySchedule(scheduleData);
      
      // Son yoklamalar
      const recentAttendanceQuery = query(
        collection(db, 'attendance'),
        where('trainerId', '==', trainerId),
        orderBy('date', 'desc'),
        limit(5)
      );
      const recentAttendanceSnapshot = await getDocs(recentAttendanceQuery);
      const recentAttendanceData = recentAttendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentAttendance(recentAttendanceData);
      
    } catch (error) {
      console.error('Trainer stats yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Antrenör paneli yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Antrenör Paneli</Text>
        <Text style={styles.subtitle}>Merhaba, {userData.name}</Text>
        <Text style={styles.roleText}>Basketbol Antrenörü</Text>
      </View>

      {/* Antrenör İstatistikleri */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Öğrencilerim"
          value={stats.myStudents.toString()}
          icon="👥"
          color="primary"
          subtitle="Aktif öğrenci"
        />
        <StatCard
          title="Gruplarım"
          value={stats.myGroups.toString()}
          icon="🏀"
          color="blue"
          subtitle="Sorumlu olduğum"
        />
        <StatCard
          title="Bugünkü Antrenman"
          value={stats.todayTrainings.toString()}
          icon="📅"
          color="green"
          subtitle="Programlanan"
        />
        <StatCard
          title="Devam Oranı"
          value={`%${stats.attendanceRate}`}
          icon="📊"
          color="purple"
          subtitle="Bu hafta"
        />
      </View>

      {/* Bugünkü Program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bugünkü Program</Text>
        <View style={styles.scheduleList}>
          {todaySchedule.length > 0 ? (
            todaySchedule.map((training, index) => (
              <View key={index} style={styles.scheduleItem}>
                <View style={styles.scheduleTime}>
                  <Text style={styles.scheduleTimeText}>
                    {training.startTime || '00:00'}
                  </Text>
                </View>
                <View style={styles.scheduleDetails}>
                  <Text style={styles.scheduleTitle}>
                    {training.groupName || 'Grup Antrenmanı'}
                  </Text>
                  <Text style={styles.scheduleSubtitle}>
                    {training.location || 'Ana Salon'}
                  </Text>
                </View>
                <View style={styles.scheduleStatus}>
                  <Text style={styles.statusText}>Aktif</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noSchedule}>
              <Text style={styles.noScheduleIcon}>📅</Text>
              <Text style={styles.noScheduleText}>Bugün antrenman programınız bulunmuyor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Hızlı İşlemler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickActions}>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={styles.quickActionText}>Yoklama Al</Text>
          </View>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>Öğrencilerimi Gör</Text>
          </View>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionText}>Performans</Text>
          </View>
        </View>
      </View>

      {/* Son Yoklamalar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Yoklamalar</Text>
        <View style={styles.attendanceList}>
          {recentAttendance.length > 0 ? (
            recentAttendance.map((attendance, index) => (
              <View key={index} style={styles.attendanceItem}>
                <Text style={styles.attendanceTitle}>
                  {attendance.groupName || 'Grup Antrenmanı'}
                </Text>
                <Text style={styles.attendanceDate}>
                  {attendance.date || new Date().toLocaleDateString('tr-TR')}
                </Text>
                <Text style={styles.attendanceCount}>
                  {attendance.presentCount || 0} kişi
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAttendance}>Henüz yoklama bulunmuyor</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  welcome: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[700] || '#374151',
    marginTop: 4,
    fontWeight: '500',
  },
  roleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.blue,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: COLORS.blue + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md) / 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  statTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
    marginBottom: SPACING.xs,
  },
  statSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  section: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    marginTop: 0,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
    marginBottom: SPACING.md,
  },
  scheduleList: {
    gap: SPACING.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  scheduleTime: {
    width: 60,
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scheduleDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  scheduleTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.gray?.[800] || '#1f2937',
  },
  scheduleSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  scheduleStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.success + '20',
    borderRadius: 8,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '500',
  },
  noSchedule: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noScheduleIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  noScheduleText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  quickActionIcon: {
    fontSize: 30,
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[700] || '#374151',
    textAlign: 'center',
  },
  attendanceList: {
    gap: SPACING.sm,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  attendanceTitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[800] || '#1f2937',
    flex: 1,
  },
  attendanceDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#6b7280',
    marginRight: SPACING.sm,
  },
  attendanceCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noAttendance: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TrainerDashboard;