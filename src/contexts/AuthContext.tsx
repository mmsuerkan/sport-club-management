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

  // Function to update auth cookies via secure API
  const updateAuthCookies = async (user: User) => {
    try {
      const token = await user.getIdToken(true); // force refresh
      
      // Use secure cookie API to set cookies
      const response = await fetch('/api/auth/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action: 'set'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set secure cookies');
      }

      return token;
    } catch (error) {
      throw error;
    }
  };

  // Clear auth cookies via secure API
  const clearAuthCookies = async () => {
    try {
      await fetch('/api/auth/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear'
        }),
      });
    } catch (error) {
      // Fallback to client-side clearing if API fails
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=strict';
      document.cookie = 'auth-state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=strict';
    }
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
      } catch (error: any) {
        console.error('Token refresh failed:', error);
        // Only logout on critical auth errors, not network errors
        if (error?.code === 'auth/invalid-user-token' || 
            error?.code === 'auth/user-token-expired' ||
            error?.code === 'auth/user-disabled') {
          await logOut();
        }
        // For other errors (network, etc.), just log and try again next time
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
        } catch (error: any) {
          console.error('Error fetching user data:', error);
          // Only logout if it's a critical auth error, not a data fetch error
          if (error?.code === 'auth/invalid-user-token' || error?.code === 'auth/user-token-expired') {
            await logOut();
          }
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
  }, []); // ❌ CRITICAL FIX: Remove tokenRefreshInterval from dependencies to prevent infinite loop

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
      await clearAuthCookies();
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
      await clearAuthCookies();
      
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