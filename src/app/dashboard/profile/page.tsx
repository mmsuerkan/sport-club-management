'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Camera,
  Shield,
  Bell,
  Globe,
  Lock,
  Activity,
  Award,
  Clock,
  Settings,
  Save,
  X,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  CheckCircle,
  Plus,
  ChevronRight
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase/config';
import { 
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  address: string;
  city: string;
  country: string;
  photoURL: string;
  department: string;
  joinedDate: Date;
  bio: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    showEmail: boolean;
    showPhone: boolean;
    showActivity: boolean;
  };
}

interface ActivityItem {
  id: string;
  type: 'login' | 'update' | 'create' | 'delete';
  description: string;
  timestamp: Date;
  details?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'settings'>('profile');
  
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: '',
    bio: '',
    department: '',
    language: 'tr',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      showEmail: true,
      showPhone: false,
      showActivity: true
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
        await fetchActivities(firebaseUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile: UserProfile = {
          id: userId,
          email: auth.currentUser?.email || '',
          displayName: userData.displayName || auth.currentUser?.displayName || '',
          phoneNumber: userData.phoneNumber || '',
          address: userData.address || '',
          city: userData.city || '',
          country: userData.country || 'Türkiye',
          photoURL: userData.photoURL || auth.currentUser?.photoURL || '',
          department: userData.department || '',
          joinedDate: userData.createdAt?.toDate() || new Date(),
          bio: userData.bio || '',
          language: userData.language || 'tr',
          notifications: userData.notifications || {
            email: true,
            push: true,
            sms: false
          },
          privacy: userData.privacy || {
            showEmail: true,
            showPhone: false,
            showActivity: true
          }
        };
        
        setUser(profile);
        setFormData({
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          bio: profile.bio,
          department: profile.department,
          language: profile.language,
          notifications: profile.notifications,
          privacy: profile.privacy
        });
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (userId: string) => {
    try {
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(activitiesQuery);
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ActivityItem[];
      
      setActivities(activitiesData);
    } catch (error) {
      console.error('Aktiviteler yüklenirken hata:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !auth.currentUser) return;
    
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-photos/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setUser(prev => prev ? { ...prev, photoURL } : null);
      
      // Log activity
      await logActivity('update', 'Profil fotoğrafı güncellendi');
      
    } catch (error) {
      console.error('Fotoğraf yüklenirken hata:', error);
      alert('Fotoğraf yüklenemedi');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!auth.currentUser || !user?.photoURL) return;
    
    try {
      // Delete from Storage
      const storageRef = ref(storage, `profile-photos/${auth.currentUser.uid}`);
      await deleteObject(storageRef).catch(() => {});
      
      // Update Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: '',
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setUser(prev => prev ? { ...prev, photoURL: '' } : null);
      
      // Log activity
      await logActivity('update', 'Profil fotoğrafı kaldırıldı');
      
    } catch (error) {
      console.error('Fotoğraf silinirken hata:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    try {
      setSavingProfile(true);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        updatedAt: Timestamp.now()
      });
      
      setUser(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);
      
      // Log activity
      await logActivity('update', 'Profil bilgileri güncellendi');
      
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      alert('Profil güncellenemedi');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Yeni şifreler eşleşmiyor');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (!auth.currentUser || !auth.currentUser.email) return;
    
    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);
      
      // Log activity
      await logActivity('update', 'Şifre değiştirildi');
      
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('Şifreniz başarıyla güncellendi');
      
    } catch (error: any) {
      console.error('Şifre güncellenirken hata:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Mevcut şifre yanlış');
      } else {
        alert('Şifre güncellenemedi');
      }
    }
  };

  const logActivity = async (type: ActivityItem['type'], description: string, details?: string) => {
    if (!auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'activities'), {
        userId: auth.currentUser.uid,
        type,
        description,
        details,
        timestamp: Timestamp.now()
      });
      
      // Refresh activities
      await fetchActivities(auth.currentUser.uid);
    } catch (error) {
      console.error('Aktivite kaydedilirken hata:', error);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Kullanıcı bulunamadı</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profil</h1>
        <p className="text-gray-600 mt-2">Profil bilgilerinizi ve ayarlarınızı yönetin</p>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="h-4 w-4 text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{user.displayName}</h2>
              <p className="text-gray-600">{user.email}</p>
              {user.department && (
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">{user.department}</span>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setEditMode(!editMode)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Düzenle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profil Bilgileri
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Aktivite Geçmişi
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ayarlar
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departman
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hakkımda
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editMode}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {editMode && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        displayName: user.displayName,
                        phoneNumber: user.phoneNumber,
                        address: user.address,
                        city: user.city,
                        country: user.country,
                        bio: user.bio,
                        department: user.department,
                        language: user.language,
                        notifications: user.notifications,
                        privacy: user.privacy
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Henüz aktivite kaydı bulunmuyor</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      {activity.details && (
                        <p className="text-sm text-gray-500 mt-1">{activity.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp.toLocaleDateString('tr-TR')} - {activity.timestamp.toLocaleTimeString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Security Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Güvenlik
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Şifre Değiştir</p>
                        <p className="text-sm text-gray-500">Hesap şifrenizi güncelleyin</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Notifications Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Bildirimler
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">E-posta Bildirimleri</p>
                        <p className="text-sm text-gray-500">Önemli güncellemeler için e-posta alın</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notifications.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, email: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Push Bildirimleri</p>
                        <p className="text-sm text-gray-500">Anlık bildirimler alın</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notifications.push}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, push: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">SMS Bildirimleri</p>
                        <p className="text-sm text-gray-500">Kritik güncellemeler için SMS alın</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notifications.sms}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, sms: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Privacy Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Gizlilik
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">E-posta Görünürlüğü</p>
                        <p className="text-sm text-gray-500">E-posta adresinizi diğer kullanıcılara göster</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.privacy.showEmail}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy: { ...formData.privacy, showEmail: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Telefon Görünürlüğü</p>
                        <p className="text-sm text-gray-500">Telefon numaranızı diğer kullanıcılara göster</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.privacy.showPhone}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy: { ...formData.privacy, showPhone: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Aktivite Görünürlüğü</p>
                        <p className="text-sm text-gray-500">Aktivitelerinizi diğer kullanıcılara göster</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.privacy.showActivity}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy: { ...formData.privacy, showActivity: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Language Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Dil
                </h3>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleProfileUpdate}
                  disabled={savingProfile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Şifre Değiştir</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  Değiştir
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}