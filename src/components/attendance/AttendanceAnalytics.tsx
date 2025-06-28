'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  AlertCircle,
  Activity
} from 'lucide-react';
import { attendanceService, AttendanceStats } from '@/lib/firebase/attendance-service';
import * as XLSX from 'xlsx';

interface AttendanceAnalyticsProps {
  branchId?: string;
  groupId?: string;
  trainerId?: string;
}

export default function AttendanceAnalytics({ branchId, groupId, trainerId }: AttendanceAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [groupByPeriod, setGroupByPeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAnalytics();
  }, [branchId, groupId, trainerId, dateRange, groupByPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // İstatistikleri getir
      const statsData = await attendanceService.getAttendanceStats({
        branchId,
        groupId,
        trainerId,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setStats(statsData);

      // Trend verilerini getir
      const trendData = await attendanceService.getAttendanceSummaryByDateRange(
        dateRange.start,
        dateRange.end,
        groupByPeriod
      );
      setAttendanceTrend(trendData);
      
    } catch (error) {
      console.error('Analiz verileri yüklenirken hata:', error);
      // Set empty data on error
      setStats({
        totalSessions: 0,
        totalStudents: 0,
        averageAttendance: 0,
        presentTotal: 0,
        absentTotal: 0,
        lateTotal: 0,
        excusedTotal: 0
      });
      setAttendanceTrend([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!stats || !attendanceTrend) return;

    const wb = XLSX.utils.book_new();
    
    // Genel İstatistikler
    const statsData = [
      ['Yoklama Raporu', new Date().toLocaleDateString('tr-TR')],
      [''],
      ['Genel İstatistikler'],
      ['Toplam Oturum', stats.totalSessions],
      ['Toplam Öğrenci', stats.totalStudents],
      ['Ortalama Katılım', `%${stats.averageAttendance.toFixed(1)}`],
      ['Toplam Katılan', stats.presentTotal],
      ['Toplam Katılmayan', stats.absentTotal],
      ['Toplam Geç Gelen', stats.lateTotal],
      ['Toplam Mazeretli', stats.excusedTotal]
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Genel İstatistikler');
    
    // Trend Verileri
    const trendHeaders = ['Tarih', 'Katılan', 'Katılmayan', 'Toplam', 'Katılım Oranı'];
    const trendRows = attendanceTrend.map(item => [
      item.date,
      item.present,
      item.absent,
      item.total,
      `%${((item.present / item.total) * 100).toFixed(1)}`
    ]);
    
    const ws2 = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Katılım Trendi');
    
    // Excel dosyasını indir
    XLSX.writeFile(wb, `yoklama_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data }: { data: any[] }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Simple line chart component
  const SimpleTrendChart = ({ data }: { data: any[] }) => {
    if (data.length === 0) {
      return (
        <div className="relative h-[200px] bg-gray-50 rounded-lg p-4 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Henüz veri bulunmuyor</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1); // Minimum 1 to avoid division by zero
    const chartHeight = 200;
    
    return (
      <div className="relative h-[200px] bg-gray-50 rounded-lg p-4">
        <div className="absolute inset-0 p-4">
          <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                points={data.map((item, index) => {
                  const x = data.length > 1 ? (index / (data.length - 1)) * 400 : 200;
                  const y = 200 - (item.value / maxValue) * 180;
                  return `${x},${y}`;
                }).join(' ')}
              />
            )}
            {data.map((item, index) => {
              const x = data.length > 1 ? (index / (data.length - 1)) * 400 : 200;
              const y = 200 - (item.value / maxValue) * 180;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#22c55e"
                  className="hover:r-6"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-[180px]">
          {data.slice(0, 5).map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Analiz verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Yoklama Analizleri</h2>
          <p className="text-gray-600 mt-1">Detaylı katılım istatistikleri ve trendler</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <FileSpreadsheet size={18} />
          Excel&apos;e Aktar
        </button>
      </div>

      {/* Date Range and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={groupByPeriod}
              onChange={(e) => setGroupByPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Günlük</option>
              <option value="week">Haftalık</option>
              <option value="month">Aylık</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Oturum</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats?.totalSessions || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Öğrenci</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats?.totalStudents || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ortalama Katılım</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                %{stats?.averageAttendance.toFixed(1) || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Devamsızlık</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats?.absentTotal || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Katılım Trendi</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <SimpleTrendChart 
            data={attendanceTrend.map(item => ({
              label: new Date(item.date).toLocaleDateString('tr-TR', { 
                day: 'numeric', 
                month: 'short' 
              }),
              value: item.total > 0 ? (item.present / item.total) * 100 : 0
            }))}
          />
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Durum Dağılımı</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <SimpleBarChart 
            data={[
              { label: 'Katıldı', value: stats?.presentTotal || 0, color: '#22c55e' },
              { label: 'Katılmadı', value: stats?.absentTotal || 0, color: '#ef4444' },
              { label: 'Geç Geldi', value: stats?.lateTotal || 0, color: '#f59e0b' },
              { label: 'Mazeretli', value: stats?.excusedTotal || 0, color: '#3b82f6' }
            ]}
          />
        </div>
      </div>

      {/* Attendance Distribution Percentages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Genel Katılım Dağılımı</h3>
          <PieChart className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">
                {stats ? Math.round((stats.presentTotal / stats.totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Katıldı</p>
            <p className="text-xs text-gray-500">{stats?.presentTotal || 0} öğrenci</p>
          </div>
          
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">
                {stats ? Math.round((stats.absentTotal / stats.totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Katılmadı</p>
            <p className="text-xs text-gray-500">{stats?.absentTotal || 0} öğrenci</p>
          </div>
          
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600">
                {stats ? Math.round((((stats.lateTotal || 0) + (stats.excusedTotal || 0)) / stats.totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Diğer</p>
            <p className="text-xs text-gray-500">{(stats?.lateTotal || 0) + (stats?.excusedTotal || 0)} öğrenci</p>
          </div>
        </div>
      </div>

      {/* Low Attendance Alert */}
      {stats && stats.averageAttendance < 70 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Düşük Katılım Uyarısı</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Ortalama katılım oranı %70&apos;in altında. Öğrencilerin devam durumunu yakından takip etmeniz önerilir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}