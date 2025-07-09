import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { UserData } from '../../lib/firebase/auth';

interface ParentDashboardProps {
  userData: UserData;
}

interface ParentStats {
  totalChildren: number;
  attendanceRate: number;
  thisMonthAttendance: number;
  pendingPayments: number;
  upcomingEvents: number;
  lastPaymentDate: string;
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

const ParentDashboard: React.FC<ParentDashboardProps> = ({ userData }) => {
  const [stats, setStats] = useState<ParentStats>({
    totalChildren: 0,
    attendanceRate: 0,
    thisMonthAttendance: 0,
    pendingPayments: 0,
    upcomingEvents: 0,
    lastPaymentDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchParentStats();
  }, [userData.id]);

  const fetchParentStats = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı ID'si ile ilişkilendirilmiş çocukları bul
      const childrenQuery = query(
        collection(db, 'students'),
        where('parentId', '==', userData.id || '')
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      const childrenData = childrenSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChildren(childrenData);
      
      if (childrenData.length === 0) {
        console.log('Bu veli hesabıyla ilişkilendirilmiş çocuk bulunamadı');
        setLoading(false);
        return;
      }
      
      const totalChildren = childrenData.length;
      
      // Bu ay devam durumu
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      let totalAttendance = 0;
      let totalPossibleAttendance = 0;
      
      for (const child of childrenData) {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', child.id),
          where('date', '>=', new Date(currentYear, currentMonth, 1)),
          where('date', '<', new Date(currentYear, currentMonth + 1, 1))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        attendanceSnapshot.forEach(doc => {
          const attendanceData = doc.data();
          if (attendanceData.present) {
            totalAttendance++;
          }
          totalPossibleAttendance++;
        });
      }
      
      const attendanceRate = totalPossibleAttendance > 0 ? 
        Math.round((totalAttendance / totalPossibleAttendance) * 100) : 0;
      
      // Ödeme durumu
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('parentId', '==', userData.id || ''),
        where('status', '==', 'pending')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const pendingPayments = paymentsSnapshot.size;
      
      // Son ödeme tarihi
      const lastPaymentQuery = query(
        collection(db, 'payments'),
        where('parentId', '==', userData.id || ''),
        where('status', '==', 'completed'),
        orderBy('date', 'desc'),
        limit(1)
      );
      const lastPaymentSnapshot = await getDocs(lastPaymentQuery);
      const lastPaymentDate = lastPaymentSnapshot.docs.length > 0 ? 
        lastPaymentSnapshot.docs[0].data().date.toDate().toLocaleDateString('tr-TR') : 
        'Henüz ödeme yok';
      
      // Yaklaşan etkinlikler
      const eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', new Date()),
        orderBy('date', 'asc'),
        limit(3)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUpcomingEvents(eventsData);
      
      setStats({
        totalChildren,
        attendanceRate,
        thisMonthAttendance: totalAttendance,
        pendingPayments,
        upcomingEvents: eventsData.length,
        lastPaymentDate
      });
      
      // Son devam durumu
      const recentAttendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', 'in', childrenData.map(child => child.id)),
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
      console.error('Parent stats yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Veli paneli yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Veli Paneli</Text>
        <Text style={styles.subtitle}>Merhaba, {userData.name}</Text>
        <Text style={styles.roleText}>Velisi</Text>
      </View>

      {/* Veli İstatistikleri */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Çocuk Sayısı"
          value={stats.totalChildren.toString()}
          icon="👶"
          color="primary"
          subtitle="Kayıtlı çocuk"
        />
        <StatCard
          title="Devam Oranı"
          value={`%${stats.attendanceRate}`}
          icon="📊"
          color="success"
          subtitle="Bu ay"
        />
        <StatCard
          title="Bekleyen Ödeme"
          value={stats.pendingPayments.toString()}
          icon="💳"
          color="warning"
          subtitle="Ödenmemiş"
        />
        <StatCard
          title="Yaklaşan Etkinlik"
          value={stats.upcomingEvents.toString()}
          icon="🎉"
          color="purple"
          subtitle="Bu ay"
        />
      </View>

      {/* Çocuklarım */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Çocuklarım</Text>
        <View style={styles.childrenList}>
          {children.length > 0 ? (
            children.map((child, index) => (
              <View key={index} style={styles.childCard}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.name?.charAt(0)?.toUpperCase() || 'Ç'}
                  </Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name || 'İsimsiz'}</Text>
                  <Text style={styles.childGroup}>{child.groupName || 'Grup belirlenmemiş'}</Text>
                  <Text style={styles.childStatus}>
                    {child.isActive ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
                <View style={styles.childStats}>
                  <Text style={styles.childStatValue}>%85</Text>
                  <Text style={styles.childStatLabel}>Devam</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noChildren}>
              <Text style={styles.noChildrenIcon}>👶</Text>
              <Text style={styles.noChildrenText}>Henüz kayıtlı çocuk bulunmuyor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Ödeme Durumu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ödeme Durumu</Text>
        <View style={styles.paymentInfo}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Son Ödeme</Text>
            <Text style={styles.paymentValue}>{stats.lastPaymentDate}</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Bekleyen Ödeme</Text>
            <Text style={[styles.paymentValue, { color: stats.pendingPayments > 0 ? COLORS.error : COLORS.success }]}>
              {stats.pendingPayments > 0 ? `${stats.pendingPayments} adet` : 'Yok'}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Aylık Ücret</Text>
            <Text style={styles.paymentValue}>₺350 / çocuk</Text>
          </View>
        </View>
      </View>

      {/* Yaklaşan Etkinlikler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
        <View style={styles.eventsList}>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventDate}>
                  <Text style={styles.eventDateText}>
                    {event.date?.toDate?.()?.getDate() || '00'}
                  </Text>
                  <Text style={styles.eventMonth}>
                    {event.date?.toDate?.()?.toLocaleDateString('tr-TR', { month: 'short' }) || 'Ay'}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{event.title || 'Etkinlik'}</Text>
                  <Text style={styles.eventLocation}>{event.location || 'Konum belirtilmemiş'}</Text>
                </View>
                <View style={styles.eventStatus}>
                  <Text style={styles.eventStatusText}>Yaklaşan</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsIcon}>📅</Text>
              <Text style={styles.noEventsText}>Yaklaşan etkinlik bulunmuyor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Son Devam Durumu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Devam Durumu</Text>
        <View style={styles.attendanceList}>
          {recentAttendance.length > 0 ? (
            recentAttendance.map((attendance, index) => (
              <View key={index} style={styles.attendanceItem}>
                <Text style={styles.attendanceDate}>
                  {attendance.date?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'}
                </Text>
                <Text style={styles.attendanceChild}>
                  {children.find(child => child.id === attendance.studentId)?.name || 'Öğrenci'}
                </Text>
                <View style={[styles.attendanceStatus, { 
                  backgroundColor: attendance.present ? COLORS.success + '20' : COLORS.error + '20' 
                }]}>
                  <Text style={[styles.attendanceStatusText, { 
                    color: attendance.present ? COLORS.success : COLORS.error 
                  }]}>
                    {attendance.present ? 'Geldi' : 'Gelmedi'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noAttendance}>Henüz devam kaydı bulunmuyor</Text>
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
    color: COLORS.success,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: COLORS.success + '20',
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
  childrenList: {
    gap: SPACING.md,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.gray?.[50] || '#f9fafb',
    borderRadius: 8,
  },
  childAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  childAvatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray?.[900] || '#111827',
  },
  childGroup: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    marginTop: 2,
  },
  childStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: 2,
  },
  childStats: {
    alignItems: 'center',
  },
  childStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  childStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  noChildren: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noChildrenIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  noChildrenText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
  },
  paymentInfo: {
    gap: SPACING.md,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  paymentLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[600] || '#6b7280',
  },
  paymentValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.gray?.[900] || '#111827',
  },
  eventsList: {
    gap: SPACING.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  eventDate: {
    width: 50,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventDateText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  eventMonth: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.gray?.[900] || '#111827',
  },
  eventLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[500] || '#6b7280',
  },
  eventStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
  },
  eventStatusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: '500',
  },
  noEvents: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noEventsIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  noEventsText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
  },
  attendanceList: {
    gap: SPACING.sm,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[100] || '#f3f4f6',
  },
  attendanceDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray?.[600] || '#6b7280',
    width: 80,
  },
  attendanceChild: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[800] || '#1f2937',
    flex: 1,
    marginLeft: SPACING.md,
  },
  attendanceStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  attendanceStatusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  noAttendance: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray?.[500] || '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ParentDashboard;