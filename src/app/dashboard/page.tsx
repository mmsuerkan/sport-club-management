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
      
      // Toplam üye sayısı
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalMembers = studentsSnapshot.size;
      
      // Aktif antrenman sayısı
      const trainingsSnapshot = await getDocs(collection(db, 'trainings'));
      const activeTrainings = trainingsSnapshot.size;
      
      // Bu ay gelir (mock veri - finansal sistem henüz tam değil)
      const monthlyRevenue = 45280;
      
      // Yaklaşan turnuva (etkinliklerden)
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const upcomingTournaments = eventsSnapshot.size;
      
      setStats({
        totalMembers,
        activeTrainings,
        monthlyRevenue,
        upcomingTournaments
      });
      
      // Son aktiviteler için mock veri (activity log sistemi eklenebilir)
      setActivities([
        {
          id: '1',
          type: 'member',
          description: 'Yeni üye kaydı',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          user: 'Ahmet Yılmaz'
        },
        {
          id: '2',
          type: 'training',
          description: 'Antrenman planı güncellendi',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
        }
      ]);
      
    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error);
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
          title="Toplam Üye"
          value={stats.totalMembers.toString()}
          change={stats.totalMembers > 0 ? 12 : 0}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Aktif Antrenman"
          value={stats.activeTrainings.toString()}
          change={stats.activeTrainings > 0 ? 8 : 0}
          icon={<Calendar size={20} />}
          color="green"
        />
        <StatCard
          title="Bu Ay Gelir"
          value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`}
          change={-5}
          icon={<DollarSign size={20} />}
          color="purple"
        />
        <StatCard
          title="Yaklaşan Etkinlik"
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
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'member' ? 'bg-green-500' : 
                  activity.type === 'training' ? 'bg-blue-500' : 'bg-purple-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activity.description}{activity.user && `: ${activity.user}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60))} saat önce
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">Henüz aktivite yok</p>
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
              <>
                <div className="border-l-4 border-blue-500 pl-3 py-1">
                  <h3 className="text-sm font-medium text-gray-900">Basketbol Antrenmanı</h3>
                  <p className="text-xs text-gray-600">Bugün, 17:00</p>
                </div>
                <div className="border-l-4 border-green-500 pl-3 py-1">
                  <h3 className="text-sm font-medium text-gray-900">Basketbol Maçı</h3>
                  <p className="text-xs text-gray-600">Yarın, 19:00</p>
                </div>
              </>
            ) : (
              <>
                <div className="border-l-4 border-orange-500 pl-3 py-1">
                  <h3 className="text-sm font-medium text-gray-900">Basketbol Antrenmanı</h3>
                  <p className="text-xs text-gray-600">Bugün, 17:00</p>
                </div>
                <div className="border-l-4 border-red-500 pl-3 py-1">
                  <h3 className="text-sm font-medium text-gray-900">Takım Toplantısı</h3>
                  <p className="text-xs text-gray-600">Cuma, 18:00</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}