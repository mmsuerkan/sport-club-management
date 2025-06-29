'use client';

import { Users, Calendar, Trophy, TrendingUp, Activity, DollarSign, Trash2, RefreshCw } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  
  console.log('🏠 Dashboard component render');
  console.log('Auth state - User:', user?.email || 'null', 'Loading:', authLoading);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeTrainings: 0,
    monthlyRevenue: 0,
    upcomingTournaments: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 Dashboard useEffect triggered');
    console.log('User:', user?.email || 'null');
    console.log('AuthLoading:', authLoading);
    console.log('Should fetch data:', user && !authLoading);
    
    // Only fetch data when user is authenticated
    if (user && !authLoading) {
      console.log('✅ Conditions met, calling fetchDashboardData');
      fetchDashboardData();
    } else {
      console.log('❌ Conditions not met for data fetching');
    }
  }, [user, authLoading]);

  const clearActivities = async () => {
    try {
      // Firebase'deki activity_logs collection'ındaki tüm logları sil
      const logsSnapshot = await getDocs(collection(db, 'activity_logs'));
      const deletePromises = logsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setActivities([]);
    } catch (error) {
      console.error('Aktiviteler silinirken hata:', error);
      // Frontend'te temizle hata durumunda
      setActivities([]);
    }
  };

  const refreshActivities = () => {
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      setLoading(true);
      
      // Toplam öğrenci sayısı
      console.log('📚 Fetching students...');
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalMembers = studentsSnapshot.size;
      console.log('✅ Students loaded:', totalMembers);
      
      // Aktif grup sayısı (antrenman yerine)
      console.log('👥 Fetching groups...');
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const activeTrainings = groupsSnapshot.size;
      console.log('✅ Groups loaded:', activeTrainings);
      
      // Bu ay gelir hesaplama (öğrenci sayısı × ortalama ücret)
      const avgMonthlyFee = 350; // Ortalama aylık ücret
      const monthlyRevenue = totalMembers * avgMonthlyFee;
      
      // Yaklaşan etkinlik/maç sayısı
      const matchesSnapshot = await getDocs(collection(db, 'matches'));
      const upcomingTournaments = matchesSnapshot.size;
      
      setStats({
        totalMembers,
        activeTrainings,
        monthlyRevenue,
        upcomingTournaments
      });
      
      // Activity logs'ları Firebase'den çek (orderBy kaldırıldı - index sorunu için)
      const activityLogsSnapshot = await getDocs(
        query(collection(db, 'activity_logs'), limit(5))
      );
      
      const recentActivities: Activity[] = [];
      activityLogsSnapshot.forEach((doc) => {
        const log = doc.data();
        recentActivities.push({
          id: doc.id,
          type: log.type || 'info',
          description: log.description || 'Bilinmeyen aktivite',
          timestamp: log.timestamp?.toDate() || new Date(),
          user: log.user || undefined
        });
      });
      
      setActivities(recentActivities);
      
    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error);
      // Hata durumunda varsayılan değerler
      setStats({
        totalMembers: 0,
        activeTrainings: 0,
        monthlyRevenue: 0,
        upcomingTournaments: 0
      });
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Veriler yükleniyor...</p>
      </div>
    );
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show login message if no user
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Lütfen giriş yapın.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Ana Sayfa</h1>
        <p className="text-gray-600 text-sm mt-1">Basketbol kulübü yönetim sistemine hoş geldiniz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          title="Toplam Öğrenci"
          value={stats.totalMembers.toString()}
          change={stats.totalMembers > 0 ? Math.floor(stats.totalMembers * 0.1) : 0}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Aktif Grup"
          value={stats.activeTrainings.toString()}
          change={stats.activeTrainings > 0 ? Math.floor(stats.activeTrainings * 0.2) : 0}
          icon={<Calendar size={20} />}
          color="green"
        />
        <StatCard
          title="Tahmini Aylık Gelir"
          value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`}
          change={stats.totalMembers > 0 ? 15 : 0}
          icon={<DollarSign size={20} />}
          color="purple"
        />
        <StatCard
          title="Kayıtlı Maç"
          value={stats.upcomingTournaments.toString()}
          icon={<Trophy size={20} />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Son Aktiviteler</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshActivities}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Yenile"
              >
                <RefreshCw size={16} className="text-gray-500" />
              </button>
              <button
                onClick={clearActivities}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Temizle"
              >
                <Trash2 size={16} className="text-gray-500" />
              </button>
              <Activity className="text-gray-400" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'member' ? 'bg-green-500' : 
                  activity.type === 'training' ? 'bg-blue-500' : 
                  activity.type === 'system' ? 'bg-purple-500' : 'bg-orange-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activity.description}{activity.user && `: ${activity.user}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.max(1, Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60)))} saat önce
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">Aktivite bulunmuyor</p>
                <p className="text-xs text-gray-400 mt-1">Öğrenci eklendiğinde burada görünecek</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Yaklaşan Etkinlikler</h2>
            <Calendar className="text-gray-400" size={18} />
          </div>
          <div className="space-y-2">
            {stats.upcomingTournaments > 0 ? (
              <div className="border-l-4 border-green-500 pl-3 py-1">
                <h3 className="text-sm font-medium text-gray-900">{stats.upcomingTournaments} Maç Planlandı</h3>
                <p className="text-xs text-gray-600">Detaylar için Maç Takvimi'ni görün</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Henüz planlanmış maç yok</p>
                <p className="text-xs text-gray-400 mt-1">Maç Takvimi bölümünden yeni maç ekleyebilirsiniz</p>
              </div>
            )}
            
            {/* Her zaman görünen varsayılan etkinlikler */}
            <div className="border-l-4 border-blue-500 pl-3 py-1">
              <h3 className="text-sm font-medium text-gray-900">Haftalık Antrenman</h3>
              <p className="text-xs text-gray-600">Pazartesi, Çarşamba, Cuma - 17:00</p>
            </div>
            
            {stats.totalMembers > 0 && (
              <div className="border-l-4 border-purple-500 pl-3 py-1">
                <h3 className="text-sm font-medium text-gray-900">Öğrenci Değerlendirme</h3>
                <p className="text-xs text-gray-600">Her ayın son haftası</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}