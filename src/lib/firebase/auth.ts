import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { auth, db } from './config';

export enum UserRole {
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT'
}

export interface UserData {
  email: string;
  name: string;
  role: UserRole;
  clubId: string;
  branchIds: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  // Mobile-specific fields
  phone?: string;
  studentId?: string; // For STUDENT role
  parentId?: string;  // For PARENT role
  children?: string[]; // For PARENT role (student IDs)
}

export const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
  try {
    // Set persistence based on remember me
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user document exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // If user document doesn't exist, create it with default values
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: user.email?.split('@')[0] || 'Kullanıcı',
        role: UserRole.ADMIN, // Default role, should be changed by admin
        clubId: '',
        branchIds: [],
        isActive: true,
        createdAt: new Date(),
        createdBy: user.uid // Self-created for first admin
      });
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

export const signUp = async (
  email: string, 
  password: string, 
  userData?: Omit<UserData, 'email' | 'createdAt'>
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name: userData?.name || email.split('@')[0] || 'Kullanıcı',
      role: userData?.role || UserRole.ADMIN,
      clubId: userData?.clubId || '',
      branchIds: userData?.branchIds || [],
      isActive: userData?.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date(),
      createdBy: userData?.createdBy || user.uid,
      phone: userData?.phone,
      studentId: userData?.studentId,
      parentId: userData?.parentId,
      children: userData?.children
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// User management functions (Admin only)
export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserData[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push({
        ...doc.data(),
        id: doc.id
      } as UserData & { id: string });
    });
    
    return users;
  } catch (error) {
    throw error;
  }
};

export const createUserByAdmin = async (
  email: string,
  password: string,
  userData: Omit<UserData, 'email' | 'createdAt'>,
  adminId: string
): Promise<User> => {
  try {
    // API endpoint'i kullanarak kullanıcı oluştur
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        userData,
        adminId
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Kullanıcı oluşturulamadı');
    }

    return result.user;
  } catch (error: any) {
    throw error;
  }
};

export const updateUserData = async (
  userId: string,
  updateData: Partial<UserData>
): Promise<void> => {
  try {
    const { updateDoc } = await import('firebase/firestore');
    
    // Undefined değerleri temizle
    const cleanedData: any = {};
    Object.keys(updateData).forEach(key => {
      const value = (updateData as any)[key];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    await updateDoc(doc(db, 'users', userId), cleanedData);
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // API endpoint'i kullanarak kullanıcıyı sil
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Kullanıcı silinemedi');
    }
  } catch (error) {
    throw error;
  }
};

export const deactivateUser = async (userId: string): Promise<void> => {
  try {
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', userId), {
      isActive: false
    });
  } catch (error) {
    throw error;
  }
};