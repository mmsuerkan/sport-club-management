'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserX, AlertCircle } from 'lucide-react';

export default function AccountDisabledPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear auth cookies
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'auth-state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Auto redirect to login after 10 seconds
    const timer = setTimeout(() => {
      window.location.href = '/login';
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleGoToLogin = () => {
    // Clear cookies completely
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'auth-state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Force redirect
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Hesap Devre Dışı
          </h1>
          
          <div className="flex items-center justify-center mb-6">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <p className="text-gray-600">
              Hesabınız yönetici tarafından devre dışı bırakılmıştır.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Hesabınızı yeniden etkinleştirmek için sistem yöneticiniz ile iletişime geçin.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleGoToLogin}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Giriş Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}