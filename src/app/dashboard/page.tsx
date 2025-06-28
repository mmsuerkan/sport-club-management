'use client';

import { Users, Calendar, Trophy, TrendingUp, Activity, DollarSign } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
      
      // Toplam öğrenci sayısı
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalMembers = studentsSnapshot.size;
      
      // Aktif grup sayısı (antrenman yerine)
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const activeTrainings = groupsSnapshot.size;
      
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
      
      // Son gerçek aktiviteler - en son eklenen öğrenciler
      const recentStudentsSnapshot = await getDocs(
        query(collection(db, 'students'), orderBy('createdAt', 'desc'), limit(2))
      );
      
      const recentActivities: Activity[] = [];
      recentStudentsSnapshot.forEach((doc) => {
        const student = doc.data();
        recentActivities.push({
          id: doc.id,
          type: 'member',
          description: 'Yeni öğrenci kaydı',
          timestamp: student.createdAt?.toDate() || new Date(),
          user: `${student.firstName} ${student.lastName}`
        });
      });
      
      // Eğer öğrenci yoksa varsayılan mesaj
      if (recentActivities.length === 0) {
        recentActivities.push({
          id: 'default',
          type: 'info',
          description: 'Henüz kayıtlı öğrenci yok',
          timestamp: new Date()
        });
      }
      
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
      setActivities([{
        id: 'error',
        type: 'error',
        description: 'Veriler yüklenemedi',
        timestamp: new Date()
      }]);
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
            <Activity className="text-gray-400" size={18} />
          </div>
          <div className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'member' ? 'bg-green-500' : 
                  activity.type === 'info' ? 'bg-blue-500' : 
                  activity.type === 'error' ? 'bg-red-500' : 'bg-purple-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activity.description}{activity.user && `: ${activity.user}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.type === 'error' || activity.type === 'info' ? 
                      'Sistem mesajı' :
                      `${Math.max(1, Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60)))} saat önce`
                    }
                  </p>
                </div>
              </div>
            ))}
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