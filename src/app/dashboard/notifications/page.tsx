'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  Bell, 
  Users, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { 
  NotificationFormData, 
  NotificationType, 
  NotificationTargetType, 
  NotificationPriority,
  Notification 
} from '@/types/notification';
import { UserRole } from '@/lib/firebase/auth';
import { getNotifications } from '@/lib/firebase/notifications';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    body: '',
    type: NotificationType.GENERAL,
    targetType: NotificationTargetType.ALL_USERS,
    targetRoles: [],
    targetUsers: [],
    targetGroups: [],
    priority: NotificationPriority.NORMAL,
    scheduledFor: undefined,
    actionUrl: '',
    imageUrl: '',
  });

  // Roller için seçenekler
  const roleOptions = [
    { value: UserRole.ADMIN, label: 'Yöneticiler' },
    { value: UserRole.TRAINER, label: 'Antrenörler' },
    { value: UserRole.PARENT, label: 'Veliler' },
    { value: UserRole.STUDENT, label: 'Öğrenciler' },
  ];

  // Bildirim tipi seçenekleri
  const typeOptions = [
    { value: NotificationType.GENERAL, label: 'Genel' },
    { value: NotificationType.ATTENDANCE, label: 'Yoklama' },
    { value: NotificationType.TRAINING, label: 'Antrenman' },
    { value: NotificationType.PAYMENT, label: 'Ödeme' },
    { value: NotificationType.ANNOUNCEMENT, label: 'Duyuru' },
    { value: NotificationType.REMINDER, label: 'Hatırlatma' },
    { value: NotificationType.EMERGENCY, label: 'Acil' },
  ];

  // Öncelik seçenekleri
  const priorityOptions = [
    { value: NotificationPriority.LOW, label: 'Düşük' },
    { value: NotificationPriority.NORMAL, label: 'Normal' },
    { value: NotificationPriority.HIGH, label: 'Yüksek' },
    { value: NotificationPriority.URGENT, label: 'Acil' },
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { notifications } = await getNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          createdBy: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Bildirim gönderilemedi');
      }

      // Form'u temizle
      setFormData({
        title: '',
        body: '',
        type: NotificationType.GENERAL,
        targetType: NotificationTargetType.ALL_USERS,
        targetRoles: [],
        targetUsers: [],
        targetGroups: [],
        priority: NotificationPriority.NORMAL,
        scheduledFor: undefined,
        actionUrl: '',
        imageUrl: '',
      });

      setShowForm(false);
      await loadNotifications();
      
      alert('Bildirim başarıyla gönderildi!');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Bildirim gönderilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        targetRoles: [...prev.targetRoles, role]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        targetRoles: prev.targetRoles.filter(r => r !== role)
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'SENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle size={16} />;
      case 'SENDING':
        return <Clock size={16} />;
      case 'FAILED':
        return <XCircle size={16} />;
      case 'SCHEDULED':
        return <Clock size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          <p className="text-gray-600">Kullanıcılara bildirim gönder ve geçmişi görüntüle</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          disabled={loading}
        >
          <Send size={20} />
          Bildirim Gönder
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {notifications.length}
              </div>
              <div className="text-sm text-gray-600">Toplam Bildirim</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.status === 'SENT').length}
              </div>
              <div className="text-sm text-gray-600">Gönderildi</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {notifications.filter(n => n.status === 'SENDING' || n.status === 'SCHEDULED').length}
              </div>
              <div className="text-sm text-gray-600">Beklemede</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {notifications.filter(n => n.status === 'FAILED').length}
              </div>
              <div className="text-sm text-gray-600">Başarısız</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bildirim Listesi */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Bildirim Geçmişi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bildirim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hedef
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İstatistik
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {notification.body}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Target size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {notification.targetType === NotificationTargetType.ALL_USERS && 'Tüm Kullanıcılar'}
                        {notification.targetType === NotificationTargetType.SPECIFIC_ROLES && 
                          `${notification.targetRoles?.length || 0} Rol`}
                        {notification.targetType === NotificationTargetType.SPECIFIC_USERS && 
                          `${notification.targetUsers?.length || 0} Kullanıcı`}
                        {notification.targetType === NotificationTargetType.SPECIFIC_GROUPS && 
                          `${notification.targetGroups?.length || 0} Grup`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notification.status)}`}>
                      {getStatusIcon(notification.status)}
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {notification.createdAt.toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">{notification.sentCount} gönderildi</span>
                      <span className="text-blue-600">{notification.readCount} okundu</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bildirim Gönderme Formu Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Bildirim Gönder</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Başlık */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Bildirim başlığı"
                />
              </div>

              {/* İçerik */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İçerik
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                  placeholder="Bildirim içeriği"
                />
              </div>

              {/* Tip ve Öncelik */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as NotificationType})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as NotificationPriority})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hedef Tip */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hedef Kitle
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({...formData, targetType: e.target.value as NotificationTargetType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={NotificationTargetType.ALL_USERS}>Tüm Kullanıcılar</option>
                  <option value={NotificationTargetType.SPECIFIC_ROLES}>Belirli Roller</option>
                  <option value={NotificationTargetType.SPECIFIC_USERS}>Belirli Kullanıcılar</option>
                  <option value={NotificationTargetType.SPECIFIC_GROUPS}>Belirli Gruplar</option>
                </select>
              </div>

              {/* Rol Seçimi */}
              {formData.targetType === NotificationTargetType.SPECIFIC_ROLES && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roller
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {roleOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.targetRoles.includes(option.value)}
                          onChange={(e) => handleRoleChange(option.value, e.target.checked)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action URL (İsteğe Bağlı)
                </label>
                <input
                  type="url"
                  value={formData.actionUrl}
                  onChange={(e) => setFormData({...formData, actionUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/page"
                />
              </div>

              {/* Butonlar */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}