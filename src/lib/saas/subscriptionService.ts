import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  SubscriptionPlan,
  UserSubscription,
  BotSession,
  SessionEndReason,
} from '../../types/saas';

/**
 * Calculates expiration for Pro plan (1 calendar month from activation)
 */
export function calculateProExpiration(fromDate: Date = new Date()): Date {
  const expires = new Date(fromDate);
  expires.setMonth(expires.getMonth() + 1);
  return expires;
}

/**
 * Calculates expiration for Free 24h session
 */
export function calculateFreeSessionExpiration(fromDate: Date = new Date(), hours: number = 24): Date {
  const expires = new Date(fromDate);
  expires.setHours(expires.getHours() + hours);
  return expires;
}

/**
 * Subscribes to realtime updates for a user's subscription record.
 * Automatically cleans up listener on unsubscribe.
 */
export function subscribeToUserSubscription(
  userId: string,
  onUpdate: (sub: UserSubscription) => void,
  onError?: (err: Error) => void
): () => void {
  const subRef = doc(db, 'subscriptions', userId);
  return onSnapshot(
    subRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserSubscription);
      } else {
        // Fallback default free subscription
        onUpdate({
          id: userId,
          userId,
          plan: 'free',
          status: 'active',
          startedAt: new Date().toISOString(),
          expiresAt: null,
          lifetime: false,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    (err) => {
      console.warn('[Subscription] Realtime listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Gets or initializes user subscription record in Firestore.
 * By default, any registered user starts with Free plan (24h per session).
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const fallbackSub: UserSubscription = {
    id: userId,
    userId,
    plan: 'free',
    status: 'active',
    startedAt: new Date().toISOString(),
    expiresAt: null,
    lifetime: false,
    updatedAt: new Date().toISOString(),
  };

  try {
    const subRef = doc(db, 'subscriptions', userId);
    const snap = await getDoc(subRef);

    if (snap.exists()) {
      const data = snap.data() as UserSubscription;
      // Check if Pro subscription is expired
      if (data.plan === 'pro' && data.expiresAt) {
        const expDate = new Date(data.expiresAt);
        if (Date.now() > expDate.getTime() && data.status === 'active') {
          const updated = { ...data, status: 'expired' as const, updatedAt: new Date().toISOString() };
          try {
            await updateDoc(subRef, { status: 'expired', updatedAt: new Date().toISOString() });
          } catch (updateErr) {
            console.warn('[Subscription] Failed to mark expired status in Firestore:', updateErr);
          }
          return updated;
        }
      }
      return data;
    }

    // Initialize Free subscription default
    try {
      await setDoc(subRef, fallbackSub);
    } catch (createErr) {
      console.warn('[Subscription] Initial subscription creation warning:', createErr);
    }
    return fallbackSub;
  } catch (err) {
    console.warn('[Subscription] Fallback to default Free subscription:', err);
    return fallbackSub;
  }
}

/**
 * Gets active bot session for user
 */
export async function getActiveBotSession(userId: string, botId: string): Promise<BotSession | null> {
  try {
    const q = query(
      collection(db, 'botSessions'),
      where('userId', '==', userId),
      where('botId', '==', botId),
      where('status', '==', 'active'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docData = snapshot.docs[0].data() as BotSession;
    const sessionDocRef = snapshot.docs[0].ref;

    // Server-side timestamp validation for Free 24h session or Pro expiration
    if (docData.expiresAt) {
      const expTime = new Date(docData.expiresAt).getTime();
      if (Date.now() >= expTime) {
        // Expired! Mark expired in Firestore
        await updateDoc(sessionDocRef, {
          status: 'expired',
          endedAt: new Date().toISOString(),
          endReason: 'expired',
        });
        return {
          ...docData,
          status: 'expired',
          endedAt: new Date().toISOString(),
          endReason: 'expired',
        };
      }
    }

    return docData;
  } catch (err) {
    console.error('Error fetching active session:', err);
    return null;
  }
}

/**
 * Starts a new bot execution session.
 * For Free: Creates a NEW 24-hour session. After 24h, user can start again for a NEW 24h session!
 * For Pro: Checks 1 month expiration.
 * For Ultra: Unlimited lifetime session.
 */
export async function startBotSession(
  userId: string,
  botId: string,
  freeDurationHours: number = 24
): Promise<{ success: boolean; session?: BotSession; error?: string }> {
  const sub = await getUserSubscription(userId);

  if (sub.status === 'suspended') {
    return { success: false, error: 'Your subscription is suspended by administrator.' };
  }

  // Check Pro expiration
  if (sub.plan === 'pro') {
    if (sub.expiresAt && Date.now() > new Date(sub.expiresAt).getTime()) {
      return { success: false, error: 'Your Pro subscription has expired. Please renew or use the Free plan.' };
    }
  }

  // End any existing stale active session first
  const existingActive = await getActiveBotSession(userId, botId);
  if (existingActive && existingActive.status === 'active') {
    const sessionRef = doc(db, 'botSessions', existingActive.id);
    await updateDoc(sessionRef, {
      status: 'stopped',
      endedAt: new Date().toISOString(),
      endReason: 'user_stopped',
    });
  }

  const now = new Date();
  let expiresAt: string | null = null;

  if (sub.plan === 'free') {
    // Exactly 24 hours from server time
    expiresAt = calculateFreeSessionExpiration(now, freeDurationHours).toISOString();
  } else if (sub.plan === 'pro') {
    expiresAt = sub.expiresAt;
  } else if (sub.plan === 'ultra') {
    expiresAt = null; // Lifetime
  }

  const sessionId = 'ses_' + Math.random().toString(36).substring(2, 10);
  const newSession: BotSession = {
    id: sessionId,
    userId,
    botId,
    plan: sub.plan,
    startedAt: now.toISOString(),
    expiresAt,
    status: 'active',
  };

  await setDoc(doc(db, 'botSessions', sessionId), newSession);

  return { success: true, session: newSession };
}

/**
 * Stops an active session
 */
export async function endBotSession(
  sessionId: string,
  reason: SessionEndReason = 'user_stopped'
): Promise<void> {
  const sessionRef = doc(db, 'botSessions', sessionId);
  await updateDoc(sessionRef, {
    status: reason === 'expired' ? 'expired' : 'stopped',
    endedAt: new Date().toISOString(),
    endReason: reason,
  });
}
