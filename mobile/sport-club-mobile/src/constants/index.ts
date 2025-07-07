// Colors
export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  }
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font Sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

// Font Weights
export const FONT_WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Screen Dimensions
export const SCREEN_PADDING = 16;

// API Endpoints
export const API_ENDPOINTS = {
  USERS: '/users',
  STUDENTS: '/students',
  TRAINERS: '/trainers',
  BRANCHES: '/branches',
  GROUPS: '/groups',
  TRAININGS: '/trainings',
  ATTENDANCE: '/attendance',
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[0-9\s\-\(\)]{10,}$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
  TIME: 'HH:mm',
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present' as const,
  ABSENT: 'absent' as const,
  LATE: 'late' as const,
  EXCUSED: 'excused' as const,
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin' as const,
  MANAGER: 'manager' as const,
  TRAINER: 'trainer' as const,
  EMPLOYEE: 'employee' as const,
};

// Days of Week
export const DAYS_OF_WEEK = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

// Level Types
export const LEVEL_TYPES = {
  BEGINNER: 'beginner' as const,
  INTERMEDIATE: 'intermediate' as const,
  ADVANCED: 'advanced' as const,
};