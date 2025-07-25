// User Types
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'admin' | 'manager' | 'trainer' | 'employee';
  branchId?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Student Types
export interface Student {
  id: string;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  tcNo: string;
  parentName: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  createdAt: Date;
}

// Trainer Types
export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  specialization?: string[];
  branchId: string;
  profilePicture?: string;
  isActive: boolean;
  hireDate: Date;
  salary?: number;
}

// Branch Types
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  managerId?: string;
  isActive: boolean;
  createdAt: Date;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  branchId: string;
  trainerId?: string;
  maxCapacity?: number;
  currentCapacity: number;
  ageGroup?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  isActive: boolean;
  createdAt: Date;
}

// Training Types
export interface Training {
  id: string;
  name: string;
  description?: string;
  branchId: string;
  groupId: string;
  trainerId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isActive: boolean;
  createdAt: Date;
}

// Attendance Types
export interface AttendanceRecord {
  id: string;
  studentId: string;
  trainingId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recordedAt: Date;
  recordedBy: string;
}

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Trainers: undefined;
  Attendance: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { student: Student };
  StudentAdd: undefined;
  StudentEdit: { student: Student };
};

export type AttendanceStackParamList = {
  AttendanceList: undefined;
  TakeAttendance: { trainingId: string };
  AttendanceHistory: { studentId?: string };
};