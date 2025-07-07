import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import Button from '../../components/ui/Button';

interface DashboardStats {
  totalMembers: number;
  activeTrainings: number;
  monthlyRevenue: number;
  upcomingTournaments: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  change?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, change }) => (
  <View style={[styles.statCard, { borderLeftColor: COLORS[color as keyof typeof COLORS] || COLORS.primary }]}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {change !== undefined && (
      <Text style={[styles.statChange, { color: change >= 0 ? COLORS.green : COLORS.red }]}>
        {change >= 0 ? '+' : ''}{change}%
      </Text>
    )}
  </View>
);

const DashboardScreen: React.FC = () => {
  const { user, logOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeTrainings: 0,
    monthlyRevenue: 0,
    upcomingTournaments: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulated data - replace with actual Firebase calls
      setTimeout(() => {
        setStats({
          totalMembers: 45,
          activeTrainings: 6,
          monthlyRevenue: 15750,
          upcomingTournaments: 3
        });
        
        setActivities([
          {
            id: '1',
            type: 'member',
            description: 'Yeni öğrenci kaydı',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            user: 'Ahmet Yılmaz'
          },
          {
            id: '2',
            type: 'training',
            description: 'Antrenman tamamlandı',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            user: 'U15 Grubu'
          },
          {
            id: '3',
            type: 'system',
            description: 'Sistem güncellendi',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
          }
        ]);
        
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcome}>Ana Sayfa</Text>
          <Text style={styles.subtitle}>Basketbol kulübü yönetim sistemine hoş geldiniz</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.gray?.[600] || '#6b7280'} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Toplam Öğrenci"
          value={stats.totalMembers.toString()}
          icon="👥"
          color="blue"
          change={10}
        />
        <StatCard
          title="Aktif Grup"
          value={stats.activeTrainings.toString()}
          icon="📅"
          color="green"
          change={5}
        />
        <StatCard
          title="Aylık Gelir"
          value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`}
          icon="💰"
          color="purple"
          change={15}
        />
        <StatCard
          title="Kayıtlı Maç"
          value={stats.upcomingTournaments.toString()}
          icon="🏆"
          color="orange"
        />
      </View>

      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Son Aktiviteler</Text>
            <Text style={styles.cardIcon}>⚡</Text>
          </View>
          <View style={styles.activitiesList}>
            {activities.length > 0 ? activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[
                  styles.activityDot,
                  {
                    backgroundColor: 
                      activity.type === 'member' ? COLORS.green :
                      activity.type === 'training' ? COLORS.blue :
                      activity.type === 'system' ? COLORS.purple : COLORS.orange
                  }
                ]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>
                    {activity.description}{activity.user && `: ${activity.user}`}
                  </Text>
                  <Text style={styles.activityTime}>
                    {Math.max(1, Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60)))} saat önce
                  </Text>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aktivite bulunmuyor</Text>
                <Text style={styles.emptySubtext}>Öğrenci eklendiğinde burada görünecek</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Yaklaşan Etkinlikler</Text>
            <Text style={styles.cardIcon}>📅</Text>
          </View>
          <View style={styles.eventsList}>
            {stats.upcomingTournaments > 0 && (
              <View style={[styles.eventItem, { borderLeftColor: COLORS.green }]}>
                <Text style={styles.eventTitle}>{stats.upcomingTournaments} Maç Planlandı</Text>
                <Text style={styles.eventSubtitle}>Detaylar için Maç Takvimi'ni görün</Text>
              </View>
            )}
            
            <View style={[styles.eventItem, { borderLeftColor: COLORS.blue }]}>
              <Text style={styles.eventTitle}>Haftalık Antrenman</Text>
              <Text style={styles.eventSubtitle}>Pazartesi, Çarşamba, Cuma - 17:00</Text>
            </View>
            
            {stats.totalMembers > 0 && (
              <View style={[styles.eventItem, { borderLeftColor: COLORS.purple }]}>
                <Text style={styles.eventTitle}>Öğrenci Değerlendirme</Text>
                <Text style={styles.eventSubtitle}>Her ayın son haftası</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 95, // Bottom tab bar için alan
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  headerLeft: {
    flex: 1,
  },
  welcome: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.gray?.[900] || '#111827',
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: 4,
    paddingRight: SPACING.md,
  },
  logoutButton: {
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md) / 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statIcon: {
    fontSize: FONT_SIZES.lg,
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
    marginBottom: 4,
  },
  statChange: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  cardsContainer: {
    padding: SPACING.lg,
    gap: SPACING.lg,
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
    borderColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray?.[900] || '#111827',
  },
  cardIcon: {
    fontSize: FONT_SIZES.lg,
  },
  activitiesList: {
    gap: SPACING.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
    borderRadius: 6,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: SPACING.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[900] || '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#9ca3af',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[400] || '#d1d5db',
    marginTop: 4,
  },
  eventsList: {
    gap: SPACING.sm,
  },
  eventItem: {
    borderLeftWidth: 4,
    paddingLeft: SPACING.sm,
    paddingVertical: 4,
  },
  eventTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray?.[900] || '#111827',
  },
  eventSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: 2,
  },
});

export default DashboardScreen;