import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  UserProfile,
  UserBot,
  UserSubscription,
  PaymentRecord,
  Announcement,
  SystemConfig,
  AdminActionLog,
} from '../../types/saas';
import { calculateProExpiration } from './subscriptionService';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'BOTCLOUD is currently performing scheduled infrastructure upgrades. We will be back online shortly!',
  registrationEnabled: true,
  freeSessionHours: 24,
  proPriceDH: 40,
  ultraPriceDH: 79,
  maxActiveBots: 500,
  supportWhatsApp: '+212 600-000000',
};

/**
 * Gets global system settings
 */
export async function getSystemSettings(): Promise<SystemConfig> {
  try {
    const docRef = doc(db, 'systemSettings', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SYSTEM_CONFIG, ...(snap.data() as SystemConfig) };
    }
  } catch (err) {
    console.error('Error loading system settings:', err);
  }
  return DEFAULT_SYSTEM_CONFIG;
}

/**
 * Updates global system settings
 */
export async function updateSystemSettings(
  config: Partial<SystemConfig>,
  adminEmail: string
): Promise<void> {
  const docRef = doc(db, 'systemSettings', 'config');
  await setDoc(docRef, config, { merge: true });
  await logAdminAction(adminEmail, 'update_system_settings', JSON.stringify(config));
}

/**
 * Logs an administrative action
 */
export async function logAdminAction(
  adminEmail: string,
  actionType: string,
  details: string,
  targetUserId?: string,
  targetBotId?: string
): Promise<void> {
  const id = 'act_' + Math.random().toString(36).substring(2, 10);
  const log: AdminActionLog = {
    id,
    adminEmail,
    actionType,
    details,
    targetUserId,
    targetBotId,
    timestamp: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'adminActions', id), log);
  } catch {
    // ignore
  }
}

/**
 * Fetches all users for admin table
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as UserProfile);
}

/**
 * Fetches all bots for admin table
 */
export async function fetchAllBots(): Promise<UserBot[]> {
  const snap = await getDocs(collection(db, 'bots'));
  return snap.docs.map((d) => d.data() as UserBot);
}

/**
 * Fetches all subscriptions for admin table
 */
export async function fetchAllSubscriptions(): Promise<UserSubscription[]> {
  const snap = await getDocs(collection(db, 'subscriptions'));
  return snap.docs.map((d) => d.data() as UserSubscription);
}

/**
 * Fetches all payments for admin table
 */
export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PaymentRecord);
}

/**
 * Fetches announcements
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Announcement);
  } catch {
    return [];
  }
}

/**
 * Creates a new system announcement
 */
export async function createAnnouncement(
  title: string,
  content: string,
  type: Announcement['type'],
  adminEmail: string
): Promise<Announcement> {
  const id = 'ann_' + Math.random().toString(36).substring(2, 10);
  const ann: Announcement = {
    id,
    title,
    content,
    type,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: adminEmail,
  };
  await setDoc(doc(db, 'announcements', id), ann);
  await logAdminAction(adminEmail, 'create_announcement', `Created: ${title}`);
  return ann;
}

/**
 * Deletes an announcement
 */
export async function deleteAnnouncement(id: string, adminEmail: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
  await logAdminAction(adminEmail, 'delete_announcement', `Deleted announcement ${id}`);
}

/**
 * Admin action: Manually change a user's subscription plan (e.g. override Free -> Pro / Ultra)
 */
export async function adminSetUserPlan(
  userId: string,
  plan: 'free' | 'pro' | 'ultra',
  adminEmail: string,
  durationMonths: number = 1
): Promise<void> {
  const subRef = doc(db, 'subscriptions', userId);
  const now = new Date();

  let expiresAt: string | null = null;
  let isLifetime = false;

  if (plan === 'pro') {
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + durationMonths);
    expiresAt = exp.toISOString();
  } else if (plan === 'ultra') {
    expiresAt = null;
    isLifetime = true;
  }

  const updated: UserSubscription = {
    id: userId,
    userId,
    plan,
    status: 'active',
    startedAt: now.toISOString(),
    expiresAt,
    lifetime: isLifetime,
    updatedAt: now.toISOString(),
  };

  await setDoc(subRef, updated, { merge: true });
  await logAdminAction(adminEmail, 'admin_set_plan', `Set user ${userId} to plan ${plan.toUpperCase()}`, userId);
}

/**
 * Admin action: Suspend or unsuspend user
 */
export async function adminToggleUserSuspension(
  userId: string,
  suspend: boolean,
  adminEmail: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const subRef = doc(db, 'subscriptions', userId);
  const botRef = doc(db, 'bots', `bot_${userId}`);

  const status = suspend ? 'suspended' : 'active';
  await updateDoc(userRef, { status });
  await updateDoc(subRef, { status });
  if (suspend) {
    await updateDoc(botRef, { status: 'suspended' });
  }

  await logAdminAction(
    adminEmail,
    suspend ? 'suspend_user' : 'unsuspend_user',
    `Toggled user ${userId} status to ${status}`,
    userId
  );
}

/**
 * Admin action: Repair or override bot server configuration for user
 */
export async function adminRepairBotConfig(
  userId: string,
  config: {
    serverHost: string;
    serverPort: number;
    minecraftVersion: string;
    username: string;
  },
  adminEmail: string
): Promise<void> {
  const botRef = doc(db, 'bots', `bot_${userId}`);
  await updateDoc(botRef, {
    serverHost: config.serverHost,
    serverPort: Number(config.serverPort),
    minecraftVersion: config.minecraftVersion,
    username: config.username,
  });

  await logAdminAction(
    adminEmail,
    'repair_bot_config',
    `Repaired bot for user ${userId} to ${config.serverHost}:${config.serverPort} (${config.minecraftVersion})`,
    userId,
    `bot_${userId}`
  );
}
