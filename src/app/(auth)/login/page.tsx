'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { signIn } from '@/lib/firebase/auth';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', data.email);
      const user = await signIn(data.email, data.password);
      
      console.log('SignIn response:', user);
      
      if (!user) {
        throw new Error('Login failed - no user returned');
      }
      
      console.log('User object type:', typeof user, user);
      
      // Set auth cookie for middleware
      const token = await user.getIdToken();
      document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
      
      console.log('Login successful, token:', token.substring(0, 50) + '...');
      console.log('Cookie set, checking cookies:', document.cookie);
      
      // Force page reload to trigger middleware
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error: any) {
      console.error('Login error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      setError(`Giriş hatası: ${error.message || 'E-posta veya şifre hatalı'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Spor Klübü Yönetim Sistemi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Hesabınıza giriş yapın
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-posta
          </label>
          <div className="mt-1">
            <input
              {...register('email', {
                required: 'E-posta zorunludur',
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Geçerli bir e-posta adresi giriniz'
                }
              })}
              type="email"
              autoComplete="email"
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Şifre
          </label>
          <div className="mt-1">
            <input
              {...register('password', {
                required: 'Şifre zorunludur',
                minLength: {
                  value: 6,
                  message: 'Şifre en az 6 karakter olmalıdır'
                }
              })}
              type="password"
              autoComplete="current-password"
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </div>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Kayıt olun
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}