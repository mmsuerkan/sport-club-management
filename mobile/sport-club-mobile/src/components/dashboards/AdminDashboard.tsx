import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { UserData } from '../../lib/firebase/auth';

interface AdminDashboardProps {
  userData: UserData;
}

interface AdminStats {
  totalStudents: number;
  totalTrainers: number;
  totalGroups: number;
  monthlyRevenue: number;
  activeStudents: number;
  newEnrollments: number;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
  change?: number;
}> = ({ title, value, icon, color, change }) => (
  <View style={[styles.statCard, { borderLeftColor: COLORS[color as keyof typeof COLORS] || COLORS.primary }]}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {change !== undefined && (
      <Text style={[styles.statChange, { color: change >= 0 ? COLORS.success : COLORS.error }]}>
        {change >= 0 ? '+' : ''}{change}%
      </Text>
    )}
  </View>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userData }) => {
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalTrainers: 0,
    totalGroups: 0,
    monthlyRevenue: 0,
    activeStudents: 0,
    newEnrollments: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      
      // Toplam öğrenci sayısı
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalStudents = studentsSnapshot.size;
      
      // Aktif öğrenciler (isActive: true)
      const activeStudentsQuery = query(
        collection(db, 'students'),
        where('isActive', '==', true)
      );
      const activeStudentsSnapshot = await getDocs(activeStudentsQuery);
      const activeStudents = activeStudentsSnapshot.size;
      
      // Toplam antrenör sayısı
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      const totalTrainers = trainersSnapshot.size;
      
      // Toplam grup sayısı
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const totalGroups = groupsSnapshot.size;
      
      // Aylık gelir hesaplama
      const monthlyRevenue = activeStudents * 350; // Ortalama aylık ücret
      
      // Bu ay yeni kayıtlar (son 30 gün)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newEnrollmentsQuery = query(
        collection(db, 'students'),
        where('createdAt', '>=', thirtyDaysAgo)
      );
      const newEnrollmentsSnapshot = await getDocs(newEnrollmentsQuery);
      const newEnrollments = newEnrollmentsSnapshot.size;
      
      setStats({
        totalStudents,
        totalTrainers,
        totalGroups,
        monthlyRevenue,
        activeStudents,
        newEnrollments
      });
      
      // Son aktiviteler
      const activitiesQuery = query(
        collection(db, 'activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentActivities(activities);
      
    } catch (error) {
      console.error('Admin stats yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yönetici paneli yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Yönetici Paneli</Text>
        <Text style={styles.subtitle}>Hoş geldin, {userData.name}</Text>
        <Text style={styles.roleText}>Sistem Yöneticisi</Text>
      </View>

      {/* Ana İstatistikler */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Toplam Öğrenci"
          value={stats.totalStudents.toString()}
          icon="👥"
          color="primary"
          change={12}
        />
        <StatCard
          title="Aktif Öğrenci"
          value={stats.activeStudents.toString()}
          icon="✅"
          color="success"
          change={8}
        />
        <StatCard
          title="Toplam Antrenör"
          value={stats.totalTrainers.toString()}
          icon="👨‍🏫"
          color="blue"
          change={5}
        />
        <StatCard
          title="Aktif Grup"
          value={stats.totalGroups.toString()}
          icon="🏀"
          color="purple"
          change={3}
        />
        <StatCard
          title="Aylık Gelir"
          value={`₺${stats.monthlyRevenue.toLocaleString()}`}
          icon="💰"
          color="green"
          change={15}
        />
        <StatCard
          title="Yeni Kayıt"
          value={stats.newEnrollments.toString()}
          icon="🆕"
          color="orange"
          change={25}
        />
      </View>

      {/* Hızlı Erişim */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
        <View style={styles.quickActions}>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>Kullanıcı Yönetimi</Text>
          </View>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionText}>Raporlar</Text>
          </View>
          <View style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>⚙️</Text>
            <Text style={styles.quickActionText}>Ayarlar</Text>
          </View>
        </View>
      </View>

      {/* Son Aktiviteler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityList}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityTitle}>{activity.description}</Text>
                <Text style={styles.activityTime}>
                  {activity.timestamp?.toDate?.()?.toLocaleDateString('tr-TR')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noActivity}>Henüz aktivite bulunmuyor</Text>
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
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: COLORS.primary + '20',
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
  statChange: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
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
  activityList: {
    gap: SPACING.sm,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  activityTitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[800] || '#1f2937',
    flex: 1,
  },
  activityTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  noActivity: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AdminDashboard;