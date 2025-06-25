'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Activity,
  Clock,
  Edit,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Search,
  User
} from 'lucide-react';

interface ActivityItem {
  id: string;
  userId: string;
  type: 'login' | 'update' | 'create' | 'delete' | 'other';
  description: string;
  details?: string;
  timestamp: Date;
  userName?: string;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchActivities();
  }, [user, userData, router, filterType, dateRange]);

  const fetchActivities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all activities for all users
      const activitiesQuery = query(
        collection(db, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(activitiesQuery);
      let activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ActivityItem[];

      // Apply client-side filters
      // Date range filter
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
      }

      if (startDate) {
        activitiesData = activitiesData.filter(activity => 
          activity.timestamp >= startDate
        );
      }

      // Filter by type
      if (filterType !== 'all') {
        activitiesData = activitiesData.filter(activity => activity.type === filterType);
      }

      // Filter by search term
      if (searchTerm) {
        activitiesData = activitiesData.filter(activity => 
          activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.userName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setActivities(activitiesData);
    } catch (error) {
      console.error('Aktiviteler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login': return <Clock className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'create': return <Plus className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login': return 'text-blue-600 bg-blue-50';
      case 'update': return 'text-yellow-600 bg-yellow-50';
      case 'create': return 'text-green-600 bg-green-50';
      case 'delete': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Aktiviteler</h1>
        <p className="text-gray-600">Sistem üzerindeki tüm aktiviteleri görüntüleyin</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Aktivite ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Tüm Tipler</option>
              <option value="login">Giriş</option>
              <option value="update">Güncelleme</option>
              <option value="create">Oluşturma</option>
              <option value="delete">Silme</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="today">Bugün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Aktivite Geçmişi ({activities.length})
          </h2>
          
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Henüz aktivite bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      {activity.userName && (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <User className="h-3 w-3" />
                          {activity.userName}
                        </span>
                      )}
                    </div>
                    {activity.details && (
                      <p className="text-sm text-gray-600 mb-1">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {format(activity.timestamp, 'dd MMMM yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}