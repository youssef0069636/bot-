export type UserRole = 'admin' | 'user';

export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  customAdminNotes?: string;
}

export type SubscriptionPlan = 'free' | 'pro' | 'ultra';

export type SubscriptionStatus = 'active' | 'expired' | 'suspended';

export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null; // null for ultra (lifetime)
  lifetime: boolean;
  paymentId?: string;
  updatedAt: string;
}

export type SessionStatus = 'active' | 'expired' | 'stopped';

export type SessionEndReason =
  | 'expired'
  | 'user_stopped'
  | 'admin_stopped'
  | 'runtime_error'
  | 'server_disconnected'
  | 'plan_changed';

export interface BotSession {
  id: string;
  userId: string;
  botId: string;
  plan: SubscriptionPlan;
  startedAt: string;
  expiresAt: string | null;
  status: SessionStatus;
  endedAt?: string;
  endReason?: SessionEndReason;
}

export type BotLifecycleStatus = 'online' | 'offline' | 'connecting' | 'suspended' | 'error';

export interface UserBot {
  id: string;
  userId: string;
  username: string;
  serverHost: string;
  serverPort: number;
  minecraftVersion: string;
  authMode: 'offline' | 'microsoft';
  autoReconnect: boolean;
  status: BotLifecycleStatus;
  activeSessionId?: string | null;
  lastOnlineAt?: string;
  createdAt: string;
  errorMessage?: string | null;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  plan: 'pro' | 'ultra';
  amount: number;
  currency: 'DH';
  status: PaymentStatus;
  proofReference?: string;
  whatsappSender?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export type AnnouncementType = 'info' | 'warning' | 'update' | 'maintenance';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  freeSessionHours: number; // default 24
  proPriceDH: number; // default 40
  ultraPriceDH: number; // default 79
  maxActiveBots: number;
  supportWhatsApp: string; // WhatsApp contact for manual payments
}

export interface AdminActionLog {
  id: string;
  adminEmail: string;
  targetUserId?: string;
  targetBotId?: string;
  actionType: string;
  details: string;
  timestamp: string;
}

export const SUPPORTED_MINECRAFT_VERSIONS = [
  '1.21.1',
  '1.21',
  '1.20.4',
  '1.20.2',
  '1.20.1',
  '1.19.4',
  '1.19.2',
  '1.18.2',
  '1.16.5',
] as const;

export type SupportedMinecraftVersion = (typeof SUPPORTED_MINECRAFT_VERSIONS)[number];
