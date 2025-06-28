'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Save, Settings as SettingsIcon, Bell, Shield, Palette, Database } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface Settings {
  id?: string;
  general: {
    clubName: string;
    clubDescription: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    eventReminders: boolean;
    paymentReminders: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'members-only';
    showEmail: boolean;
    showPhone: boolean;
    dataCollection: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    language: 'tr' | 'en';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  };
  system: {
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableAuditLog: boolean;
  };
}

const defaultSettings: Settings = {
  general: {
    clubName: '',
    clubDescription: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    eventReminders: true,
    paymentReminders: true
  },
  privacy: {
    profileVisibility: 'members-only',
    showEmail: false,
    showPhone: false,
    dataCollection: true
  },
  appearance: {
    theme: 'light',
    language: 'tr',
    dateFormat: 'dd/mm/yyyy'
  },
  system: {
    backupFrequency: 'daily',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableAuditLog: true
  }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'app-settings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings({ ...defaultSettings, ...data, id: docSnap.id });
      } else {
        // İlk kez ayarlar oluşturuluyor
        await setDoc(docRef, {
          ...defaultSettings,
          createdAt: new Date(),
          createdBy: user?.uid
        });
        setSettings({ ...defaultSettings, id: 'app-settings' });
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'settings', 'app-settings');
      await updateDoc(docRef, {
        ...settings,
        updatedAt: new Date(),
        updatedBy: user?.uid
      });
      alert('Ayarlar başarıyla kaydedildi!');
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      alert('Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setSettings(defaultSettings);
      const docRef = doc(db, 'settings', 'app-settings');
      await updateDoc(docRef, {
        ...defaultSettings,
        updatedAt: new Date(),
        updatedBy: user?.uid
      });
      setShowResetModal(false);
      alert('Ayarlar varsayılan değerlere sıfırlandı!');
    } catch (error) {
      console.error('Ayarlar sıfırlanırken hata:', error);
      alert('Ayarlar sıfırlanırken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: keyof Settings, field: string, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'general', name: 'Genel', icon: SettingsIcon },
    { id: 'notifications', name: 'Bildirimler', icon: Bell },
    { id: 'privacy', name: 'Gizlilik', icon: Shield },
    { id: 'appearance', name: 'Görünüm', icon: Palette },
    { id: 'system', name: 'Sistem', icon: Database }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Ayarlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-gray-600 mt-2">Sistem ayarlarını yönetin</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sıfırla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save size={20} />
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200">
            <nav className="p-6 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Genel Ayarlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Klüp Adı
                    </label>
                    <input
                      type="text"
                      value={settings.general.clubName}
                      onChange={(e) => updateSettings('general', 'clubName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Klüp adını giriniz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim E-postası
                    </label>
                    <input
                      type="email"
                      value={settings.general.contactEmail}
                      onChange={(e) => updateSettings('general', 'contactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim Telefonu
                    </label>
                    <input
                      type="tel"
                      value={settings.general.contactPhone}
                      onChange={(e) => updateSettings('general', 'contactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+90 XXX XXX XX XX"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Klüp Açıklaması
                    </label>
                    <textarea
                      value={settings.general.clubDescription}
                      onChange={(e) => updateSettings('general', 'clubDescription', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Klüp hakkında kısa açıklama"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adres
                    </label>
                    <textarea
                      value={settings.general.address}
                      onChange={(e) => updateSettings('general', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Klüp adresi"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Bildirim Ayarları</h2>
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'E-posta Bildirimleri', description: 'Önemli güncellemeler için e-posta bildirimleri al' },
                    { key: 'pushNotifications', label: 'Push Bildirimleri', description: 'Tarayıcı bildirimleri' },
                    { key: 'smsNotifications', label: 'SMS Bildirimleri', description: 'SMS ile bildirim al' },
                    { key: 'eventReminders', label: 'Etkinlik Hatırlatıcıları', description: 'Yaklaşan etkinlikler için hatırlatıcı' },
                    { key: 'paymentReminders', label: 'Ödeme Hatırlatıcıları', description: 'Ödeme tarihleri için hatırlatıcı' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications[item.key as keyof typeof settings.notifications] as boolean}
                          onChange={(e) => updateSettings('notifications', item.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Gizlilik Ayarları</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profil Görünürlüğü
                    </label>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => updateSettings('privacy', 'profileVisibility', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">Herkese Açık</option>
                      <option value="members-only">Sadece Üyeler</option>
                      <option value="private">Gizli</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'showEmail', label: 'E-posta Adresini Göster', description: 'E-posta adresiniz diğer üyelere görünsün' },
                      { key: 'showPhone', label: 'Telefon Numarasını Göster', description: 'Telefon numaranız diğer üyelere görünsün' },
                      { key: 'dataCollection', label: 'Veri Toplama', description: 'Kullanım verilerinin toplanmasına izin ver' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.privacy[item.key as keyof typeof settings.privacy] as boolean}
                            onChange={(e) => updateSettings('privacy', item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Görünüm Ayarları</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tema
                    </label>
                    <select
                      value={settings.appearance.theme}
                      onChange={(e) => updateSettings('appearance', 'theme', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="light">Açık</option>
                      <option value="dark">Koyu</option>
                      <option value="auto">Otomatik</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dil
                    </label>
                    <select
                      value={settings.appearance.language}
                      onChange={(e) => updateSettings('appearance', 'language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih Formatı
                    </label>
                    <select
                      value={settings.appearance.dateFormat}
                      onChange={(e) => updateSettings('appearance', 'dateFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="dd/mm/yyyy">GG/AA/YYYY</option>
                      <option value="mm/dd/yyyy">AA/GG/YYYY</option>
                      <option value="yyyy-mm-dd">YYYY-AA-GG</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Sistem Ayarları</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yedekleme Sıklığı
                    </label>
                    <select
                      value={settings.system.backupFrequency}
                      onChange={(e) => updateSettings('system', 'backupFrequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Günlük</option>
                      <option value="weekly">Haftalık</option>
                      <option value="monthly">Aylık</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oturum Zaman Aşımı (dakika)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.system.sessionTimeout}
                      onChange={(e) => updateSettings('system', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maksimum Giriş Denemesi
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.system.maxLoginAttempts}
                      onChange={(e) => updateSettings('system', 'maxLoginAttempts', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Denetim Günlüğü</h3>
                        <p className="text-sm text-gray-500">Sistem etkinliklerini kaydet</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.system.enableAuditLog}
                          onChange={(e) => updateSettings('system', 'enableAuditLog', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setShowResetModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Ayarları Sıfırla</h2>
            <p className="text-gray-600 mb-6">
              Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 rounded-lg transition-colors"
              >
                {saving ? 'Sıfırlanıyor...' : 'Sıfırla'}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}