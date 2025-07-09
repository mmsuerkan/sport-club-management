export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetRoles?: string[];
  targetUsers?: string[];
  targetGroups?: string[];
  createdAt: Date;
  createdBy: string;
  scheduledFor?: Date;
  status: NotificationStatus;
  sentCount: number;
  readCount: number;
  actionUrl?: string;
  priority: NotificationPriority;
  imageUrl?: string;
  data?: Record<string, any>;
}

export enum NotificationType {
  GENERAL = 'GENERAL',
  ATTENDANCE = 'ATTENDANCE',
  TRAINING = 'TRAINING',
  PAYMENT = 'PAYMENT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  EMERGENCY = 'EMERGENCY'
}

export enum NotificationTargetType {
  ALL_USERS = 'ALL_USERS',
  SPECIFIC_ROLES = 'SPECIFIC_ROLES',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
  SPECIFIC_GROUPS = 'SPECIFIC_GROUPS'
}

export enum NotificationStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface UserToken {
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: Date;
  isActive: boolean;
}

export interface NotificationSetting {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export interface NotificationReceipt {
  id: string;
  notificationId: string;
  userId: string;
  deliveredAt: Date;
  readAt?: Date;
  clickedAt?: Date;
  status: 'delivered' | 'read' | 'clicked' | 'failed';
}

export interface NotificationFormData {
  title: string;
  body: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetRoles: string[];
  targetUsers: string[];
  targetGroups: string[];
  priority: NotificationPriority;
  scheduledFor?: Date;
  actionUrl?: string;
  imageUrl?: string;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
}