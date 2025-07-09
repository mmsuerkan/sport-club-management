import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

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
  displayName?: string;
  studentId?: string; // For STUDENT role
  parentId?: string;  // For PARENT role
  children?: string[]; // For PARENT role (student IDs)
}

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user document exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // If user document doesn't exist, create it with default values
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
        role: UserRole.STUDENT, // Default role for mobile users
        clubId: '',
        branchIds: [],
        isActive: true,
        createdAt: new Date(),
        createdBy: user.uid,
        displayName: user.displayName || '',
        phone: ''
      });
    } else {
      // Check if user account is active
      const userData = userDoc.data();
      if (userData && userData.isActive === false) {
        await signOut(auth);
        throw new Error('Hesabınız devre dışı bırakılmıştır. Lütfen yönetici ile iletişime geçin.');
      }
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
    
    // Update profile if displayName is provided
    if (userData?.displayName) {
      await updateProfile(user, {
        displayName: userData.displayName
      });
    }
    
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name: userData?.name || userData?.displayName || email.split('@')[0] || 'Kullanıcı',
      role: userData?.role || UserRole.STUDENT,
      clubId: userData?.clubId || '',
      branchIds: userData?.branchIds || [],
      isActive: userData?.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date(),
      createdBy: userData?.createdBy || user.uid,
      displayName: userData?.displayName || '',
      phone: userData?.phone || '',
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
      const data = userDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as UserData;
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

// Role-based utility functions
export const hasRole = (userData: UserData | null, role: UserRole): boolean => {
  return userData?.role === role;
};

export const hasAnyRole = (userData: UserData | null, roles: UserRole[]): boolean => {
  return userData ? roles.includes(userData.role) : false;
};

export const isAdmin = (userData: UserData | null): boolean => {
  return hasRole(userData, UserRole.ADMIN);
};

export const isTrainer = (userData: UserData | null): boolean => {
  return hasRole(userData, UserRole.TRAINER);
};

export const isParent = (userData: UserData | null): boolean => {
  return hasRole(userData, UserRole.PARENT);
};

export const isStudent = (userData: UserData | null): boolean => {
  return hasRole(userData, UserRole.STUDENT);
};

export const canManageStudents = (userData: UserData | null): boolean => {
  return hasAnyRole(userData, [UserRole.ADMIN, UserRole.TRAINER]);
};

export const canManageTrainers = (userData: UserData | null): boolean => {
  return hasRole(userData, UserRole.ADMIN);
};

export const canTakeAttendance = (userData: UserData | null): boolean => {
  return hasAnyRole(userData, [UserRole.ADMIN, UserRole.TRAINER]);
};

export const canViewReports = (userData: UserData | null): boolean => {
  return hasAnyRole(userData, [UserRole.ADMIN, UserRole.TRAINER]);
};