'use client';

import { Users, Calendar, Trophy, TrendingUp, Activity, DollarSign } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">Spor klübü yönetim paneline hoş geldiniz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          title="Toplam Üye"
          value="248"
          change={12}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Aktif Antrenman"
          value="16"
          change={8}
          icon={<Calendar size={20} />}
          color="green"
        />
        <StatCard
          title="Bu Ay Gelir"
          value="₺45,280"
          change={-5}
          icon={<DollarSign size={20} />}
          color="purple"
        />
        <StatCard
          title="Yaklaşan Turnuva"
          value="3"
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
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Yeni üye: Ahmet Yılmaz</p>
                <p className="text-xs text-gray-500">2 saat önce</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Plan güncellendi</p>
                <p className="text-xs text-gray-500">5 saat önce</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Yaklaşan Etkinlikler</h2>
            <Calendar className="text-gray-400" size={18} />
          </div>
          <div className="space-y-2">
            <div className="border-l-4 border-blue-500 pl-3 py-1">
              <h3 className="text-sm font-medium text-gray-900">Yüzme Antrenmanı</h3>
              <p className="text-xs text-gray-600">Bugün, 15:00</p>
            </div>
            <div className="border-l-4 border-green-500 pl-3 py-1">
              <h3 className="text-sm font-medium text-gray-900">Basketbol Turnuvası</h3>
              <p className="text-xs text-gray-600">Yarın, 10:00</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}