import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { UserData } from '../../lib/firebase/auth';

interface StudentDashboardProps {
  userData: UserData;
}

interface StudentStats {
  attendanceRate: number;
  thisMonthAttendance: number;
  totalTrainings: number;
  missedTrainings: number;
  currentRank: string;
  nextTraining: string;
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

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userData }) => {
  const [stats, setStats] = useState<StudentStats>({
    attendanceRate: 0,
    thisMonthAttendance: 0,
    totalTrainings: 0,
    missedTrainings: 0,
    currentRank: 'Başlangıç',
    nextTraining: 'Bilinmiyor'
  });
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentStats();
  }, [userData.id]);

  const fetchStudentStats = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı ID'si ile ilişkilendirilmiş öğrenci kaydını bul
      const studentQuery = query(
        collection(db, 'students'),
        where('userId', '==', userData.id || '')
      );
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        console.log('Bu öğrenci hesabıyla ilişkilendirilmiş kayıt bulunamadı');
        setLoading(false);
        return;
      }
      
      const studentData = studentSnapshot.docs[0].data();
      const studentId = studentSnapshot.docs[0].id;
      setStudentInfo({ id: studentId, ...studentData });
      
      // Bu ay devam durumu
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        where('date', '>=', new Date(currentYear, currentMonth, 1)),
        where('date', '<', new Date(currentYear, currentMonth + 1, 1))
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let presentCount = 0;
      let totalCount = 0;
      
      attendanceSnapshot.forEach(doc => {
        const attendanceData = doc.data();
        if (attendanceData.present) {
          presentCount++;
        }
        totalCount++;
      });
      
      const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      
      // Toplam antrenman sayısı
      const totalAttendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId)
      );
      const totalAttendanceSnapshot = await getDocs(totalAttendanceQuery);
      const totalTrainings = totalAttendanceSnapshot.size;
      
      // Kaçırılan antrenman sayısı
      let missedTrainings = 0;
      totalAttendanceSnapshot.forEach(doc => {
        const attendanceData = doc.data();
        if (!attendanceData.present) {
          missedTrainings++;
        }
      });
      
      // Yaklaşan antrenmanlar
      const upcomingTrainingsQuery = query(
        collection(db, 'trainings'),
        where('groupId', '==', studentData.groupId || ''),
        where('date', '>=', new Date()),
        orderBy('date', 'asc'),
        limit(3)
      );
      const upcomingTrainingsSnapshot = await getDocs(upcomingTrainingsQuery);
      const upcomingTrainingsData = upcomingTrainingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUpcomingTrainings(upcomingTrainingsData);
      
      const nextTraining = upcomingTrainingsData.length > 0 ? 
        upcomingTrainingsData[0].date.toDate().toLocaleDateString('tr-TR') : 
        'Planlanmamış';
      
      setStats({
        attendanceRate,
        thisMonthAttendance: presentCount,
        totalTrainings,
        missedTrainings,
        currentRank: studentData.level || 'Başlangıç',
        nextTraining
      });
      
      // Son devam durumu
      const recentAttendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc'),
        limit(10)
      );
      const recentAttendanceSnapshot = await getDocs(recentAttendanceQuery);
      const recentAttendanceData = recentAttendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentAttendance(recentAttendanceData);
      
    } catch (error) {
      console.error('Student stats yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Öğrenci paneli yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Öğrenci Paneli</Text>
        <Text style={styles.subtitle}>Merhaba, {userData.name}</Text>
        <Text style={styles.roleText}>Basketbol Öğrencisi</Text>
      </View>

      {/* Öğrenci Profil Kartı */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {userData.name?.charAt(0)?.toUpperCase() || 'Ö'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData.name}</Text>
          <Text style={styles.profileGroup}>{studentInfo?.groupName || 'Grup belirlenmemiş'}</Text>
          <Text style={styles.profileLevel}>Seviye: {stats.currentRank}</Text>
        </View>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>🏀</Text>
        </View>
      </View>

      {/* Öğrenci İstatistikleri */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Devam Oranı"
          value={`%${stats.attendanceRate}`}
          icon="📊"
          color="success"
          subtitle="Bu ay"
        />
        <StatCard
          title="Bu Ay Geldiği"
          value={stats.thisMonthAttendance.toString()}
          icon="✅"
          color="primary"
          subtitle="Antrenman"
        />
        <StatCard
          title="Toplam Antrenman"
          value={stats.totalTrainings.toString()}
          icon="🏀"
          color="blue"
          subtitle="Katıldığı"
        />
        <StatCard
          title="Kaçırdığı"
          value={stats.missedTrainings.toString()}
          icon="❌"
          color="error"
          subtitle="Antrenman"
        />
      </View>

      {/* Yaklaşan Antrenmanlar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yaklaşan Antrenmanlar</Text>
        <View style={styles.trainingsList}>
          {upcomingTrainings.length > 0 ? (
            upcomingTrainings.map((training, index) => (
              <View key={index} style={styles.trainingItem}>
                <View style={styles.trainingDate}>
                  <Text style={styles.trainingDateText}>
                    {training.date?.toDate?.()?.getDate() || '00'}
                  </Text>
                  <Text style={styles.trainingMonth}>
                    {training.date?.toDate?.()?.toLocaleDateString('tr-TR', { month: 'short' }) || 'Ay'}
                  </Text>
                </View>
                <View style={styles.trainingDetails}>
                  <Text style={styles.trainingTitle}>
                    {training.title || 'Basketbol Antrenmanı'}
                  </Text>
                  <Text style={styles.trainingTime}>
                    {training.startTime || '17:00'} - {training.endTime || '18:00'}
                  </Text>
                  <Text style={styles.trainingLocation}>
                    {training.location || 'Ana Salon'}
                  </Text>
                </View>
                <View style={styles.trainingStatus}>
                  <Text style={styles.trainingStatusText}>Yaklaşan</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noTrainings}>
              <Text style={styles.noTrainingsIcon}>📅</Text>
              <Text style={styles.noTrainingsText}>Yaklaşan antrenman bulunmuyor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Motivasyon Kartı */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motivasyon</Text>
        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>🎯</Text>
          <Text style={styles.motivationTitle}>Harika Gidiyorsun!</Text>
          <Text style={styles.motivationText}>
            Bu ay %{stats.attendanceRate} devam oranıyla çok başarılısın. 
            Hedefin %90'a ulaşmak için {Math.max(0, Math.ceil((90 - stats.attendanceRate) / 10))} antrenman daha katılmalısın.
          </Text>
        </View>
      </View>

      {/* Performans Grafiği */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son 10 Antrenman</Text>
        <View style={styles.performanceChart}>
          {recentAttendance.length > 0 ? (
            <View style={styles.chartContainer}>
              {recentAttendance.slice(0, 10).reverse().map((attendance, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={[
                    styles.chartBarFill,
                    { backgroundColor: attendance.present ? COLORS.success : COLORS.error }
                  ]} />
                  <Text style={styles.chartLabel}>
                    {attendance.date?.toDate?.()?.getDate() || index + 1}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noPerformance}>Henüz performans verisi bulunmuyor</Text>
          )}
        </View>
      </View>

      {/* Hızlı Bilgiler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı Bilgiler</Text>
        <View style={styles.quickInfo}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>🏆</Text>
            <Text style={styles.quickInfoText}>Mevcut Seviye: {stats.currentRank}</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>📅</Text>
            <Text style={styles.quickInfoText}>Sonraki Antrenman: {stats.nextTraining}</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>👥</Text>
            <Text style={styles.quickInfoText}>Grup: {studentInfo?.groupName || 'Belirlenmemiş'}</Text>
          </View>
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
    color: COLORS.purple,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: COLORS.purple + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  profileCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  profileAvatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
  },
  profileGroup: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: 2,
  },
  profileLevel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBadgeText: {
    fontSize: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg,
    paddingTop: 0,
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
  trainingsList: {
    gap: SPACING.sm,
  },
  trainingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  trainingDate: {
    width: 50,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  trainingDateText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  trainingMonth: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  trainingDetails: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.gray?.[900] || '#111827',
  },
  trainingTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: 2,
  },
  trainingLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  trainingStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
  },
  trainingStatusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: '500',
  },
  noTrainings: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noTrainingsIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  noTrainingsText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
  },
  motivationCard: {
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  motivationIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  motivationTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  motivationText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[700] || '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  performanceChart: {
    paddingVertical: SPACING.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '100%',
    height: 40,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  chartLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  noPerformance: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quickInfo: {
    gap: SPACING.md,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  quickInfoIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  quickInfoText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[700] || '#374151',
    flex: 1,
  },
});

export default StudentDashboard;