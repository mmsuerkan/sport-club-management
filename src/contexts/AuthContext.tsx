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

  // Token refresh interval
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to update auth cookies
  const updateAuthCookies = async (user: User) => {
    try {
      const token = await user.getIdToken(true); // force refresh
      
      // Set auth cookies with proper state and 1 hour expiry
      document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`;
      document.cookie = `auth-state=authenticated; path=/; max-age=3600; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`;
      
      return token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  };

  // Clear auth cookies
  const clearAuthCookies = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
    document.cookie = 'auth-state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
  };

  // Setup token refresh interval
  const setupTokenRefresh = (user: User) => {
    // Clear existing interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }

    // Refresh token every 50 minutes (tokens expire in 1 hour)
    const interval = setInterval(async () => {
      try {
        await updateAuthCookies(user);
      } catch (error) {
        console.error('Token refresh failed, logging out:', error);
        await logOut();
      }
    }, 50 * 60 * 1000); // 50 minutes

    setTokenRefreshInterval(interval);
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Update cookies and setup refresh
          await updateAuthCookies(user);
          setupTokenRefresh(user);
          
          const data = await getUserData(user.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If there's an error getting user data or token, logout
          await logOut();
        }
      } else {
        // Clear cookies, user data and intervals when user is null
        clearAuthCookies();
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
          setTokenRefreshInterval(null);
        }
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [tokenRefreshInterval]);

  const signIn = async (email: string, password: string) => {
    try {
      const user = await firebaseSignIn(email, password);
      
      // Update cookies and setup refresh immediately after successful login
      await updateAuthCookies(user);
      setupTokenRefresh(user);
      
      const data = await getUserData(user.uid);
      setUserData(data);
    } catch (error) {
      // Clear any cookies on login failure
      clearAuthCookies();
      throw error;
    }
  };

  const logOut = async () => {
    try {
      // Clear user data first to prevent listeners from trying to fetch data
      setUser(null);
      setUserData(null);
      
      // Clear refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }
      
      // Clear all auth cookies
      clearAuthCookies();
      
      // Then sign out from Firebase
      await firebaseLogOut();
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear everything and redirect
      clearAuthCookies();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }
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