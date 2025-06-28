'use client';

import { Bell, Search, User, LogOut, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>('');
  const { user, logOut } = useAuth();

  useEffect(() => {
    const fetchClubInfo = async () => {
      if (!user) return;
      
      try {
        // Önce settings'den klüp bilgilerini al
        const settingsDoc = await getDoc(doc(db, 'settings', 'app-settings'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setClubName(settings.general?.clubName || 'Spor Kulübü');
        }
        
        // Sonra kullanıcı profilinden logo bilgisini al
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLogoUrl(userData.photoURL || null);
        }
      } catch (error) {
        console.error('Klüp bilgileri yüklenirken hata:', error);
      }
    };
    
    fetchClubInfo();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          {/* Logo ve Klüp Adı */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="relative w-10 h-10">
                <Image
                  src={logoUrl}
                  alt="Klüp Logo"
                  fill
                  className="object-cover rounded-full"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {clubName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
              {clubName}
            </h1>
          </div>
          
          <div className="relative ml-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Ara..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg w-64 lg:w-96 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparency"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.email?.split('@')[0] || 'Kullanıcı'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={16} />
                  Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <LogOut size={16} />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}