'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getUserData, signIn as firebaseSignIn, logOut as firebaseLogOut, UserData } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Check if token is valid
          const token = await user.getIdToken(true);
          
          // Set auth cookie
          document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
          
          const data = await getUserData(user.uid);
          setUserData(data);
        } catch (error: any) {
          console.error('Error fetching user data:', error);
          // If token is expired or invalid, sign out
          if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
            await logOut();
          }
        }
      } else {
        setUserData(null);
        // Clear auth cookie when user is null
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
      }
      
      setLoading(false);
    });

    // Check token validity every 30 minutes
    const interval = setInterval(async () => {
      if (user) {
        try {
          await user.getIdToken(true);
        } catch (error) {
          console.error('Token refresh failed:', error);
          await logOut();
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, router]);

  const signIn = async (email: string, password: string) => {
    const user = await firebaseSignIn(email, password);
    const data = await getUserData(user.uid);
    setUserData(data);
  };

  const logOut = async () => {
    try {
      // Clear user data first to prevent listeners from trying to fetch data
      setUser(null);
      setUserData(null);
      
      // Clear auth cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
      
      // Then sign out from Firebase
      await firebaseLogOut();
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}