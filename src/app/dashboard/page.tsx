'use client';

import { Users, Calendar, Trophy, TrendingUp, Activity, DollarSign } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Spor klübü yönetim paneline hoş geldiniz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h2>
            <Activity className="text-gray-400" size={20} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Yeni üye kaydı: Ahmet Yılmaz</p>
                <p className="text-xs text-gray-500">2 saat önce</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Antrenman planı güncellendi</p>
                <p className="text-xs text-gray-500">5 saat önce</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Ödeme alındı: ₺2,500</p>
                <p className="text-xs text-gray-500">1 gün önce</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Yaklaşan Etkinlikler</h2>
            <Calendar className="text-gray-400" size={20} />
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">Yüzme Antrenmanı</h3>
              <p className="text-sm text-gray-600">Bugün, 15:00 - 17:00</p>
              <p className="text-xs text-gray-500 mt-1">12 katılımcı</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">Basketbol Turnuvası</h3>
              <p className="text-sm text-gray-600">Yarın, 10:00</p>
              <p className="text-xs text-gray-500 mt-1">8 takım</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">Fitness Değerlendirme</h3>
              <p className="text-sm text-gray-600">Cuma, 14:00 - 18:00</p>
              <p className="text-xs text-gray-500 mt-1">25 üye</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performans Özeti</h2>
          <TrendingUp className="text-gray-400" size={20} />
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Grafik alanı - Yakında eklenecek</p>
        </div>
      </div>
    </div>
  );
}