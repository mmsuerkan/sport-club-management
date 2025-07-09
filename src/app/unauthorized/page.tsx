'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UnauthorizedPage() {
  const { logOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Auto logout after 5 seconds
    const timer = setTimeout(() => {
      logOut();
    }, 5000);

    return () => clearTimeout(timer);
  }, [logOut]);

  const handleLogout = async () => {
    await logOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Yetkisiz Erişim
        </h1>

        <p className="text-gray-600 mb-6">
          Web yönetim paneline erişim yetkiniz bulunmamaktadır. 
          Bu panel sadece yönetici (ADMIN) hesapları için kullanılabilir.
        </p>

        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            <p>📱 Mobil uygulamayı kullanabilirsiniz</p>
            <p>📧 Yönetici ile iletişime geçin</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Çıkış Yap
          </button>

          <p className="text-xs text-gray-400">
            5 saniye sonra otomatik olarak çıkış yapılacaktır...
          </p>
        </div>
      </div>
    </div>
  );
}