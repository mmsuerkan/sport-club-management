import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  onAuthChange, 
  getUserData, 
  signIn as firebaseSignIn, 
  logOut as firebaseLogOut, 
  signUp as firebaseSignUp,
  resetPassword as firebaseResetPassword,
  UserData 
} from '../lib/firebase/auth';
import { initializeNotificationService } from '../services/notifications';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: Omit<UserData, 'email' | 'createdAt'>) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const data = await getUserData(user.uid);
          setUserData(data);
          
          // Initialize notification service after user login
          await initializeNotificationService(user.uid);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const user = await firebaseSignIn(email, password);
      const data = await getUserData(user.uid);
      setUserData(data);
      
      // Initialize notification service after sign in
      await initializeNotificationService(user.uid);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData?: Omit<UserData, 'email' | 'createdAt'>
  ): Promise<void> => {
    try {
      const user = await firebaseSignUp(email, password, userData);
      const data = await getUserData(user.uid);
      setUserData(data);
      
      // Initialize notification service after sign up
      await initializeNotificationService(user.uid);
    } catch (error) {
      throw error;
    }
  };

  const logOut = async (): Promise<void> => {
    try {
      // Clear states first to prevent infinite loop
      setUser(null);
      setUserData(null);
      
      await firebaseLogOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await firebaseResetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};