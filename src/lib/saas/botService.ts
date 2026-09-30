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
import { UserBot, SUPPORTED_MINECRAFT_VERSIONS, BotLifecycleStatus } from '../../types/saas';

/**
 * Subscribes to realtime updates for a user's bot document.
 * Automatically cleans up listener on unsubscribe.
 */
export function subscribeToUserBot(
  userId: string,
  onUpdate: (bot: UserBot) => void,
  onError?: (err: Error) => void
): () => void {
  const botDocId = `bot_${userId}`;
  const botRef = doc(db, 'bots', botDocId);
  return onSnapshot(
    botRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserBot);
      }
    },
    (err) => {
      console.warn('[BotService] Realtime bot listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Ensures exactly ONE bot per user.
 * If user does not have a bot yet, creates it.
 */
export async function getOrCreateUserBot(
  userId: string,
  userEmail: string,
  defaultName?: string
): Promise<UserBot> {
  const botDocId = `bot_${userId}`;
  const botRef = doc(db, 'bots', botDocId);

  const cleanUsername =
    defaultName ||
    `Bot_${userEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 10)}`;

  const fallbackBot: UserBot = {
    id: botDocId,
    userId,
    username: cleanUsername || 'BotCloud_User',
    serverHost: 'jeuxapk6.aternos.me',
    serverPort: 63257,
    minecraftVersion: '1.20.1',
    authMode: 'offline',
    autoReconnect: true,
    status: 'offline',
    createdAt: new Date().toISOString(),
  };

  try {
    const snap = await getDoc(botRef);

    if (snap.exists()) {
      return snap.data() as UserBot;
    }

    try {
      await setDoc(botRef, fallbackBot);
    } catch (writeErr) {
      console.warn('[BotService] Initial bot creation warning:', writeErr);
    }
    return fallbackBot;
  } catch (err) {
    console.warn('[BotService] Fallback to in-memory bot configuration:', err);
    return fallbackBot;
  }
}

/**
 * Validates selected Minecraft version
 */
export function isVersionSupported(version: string): boolean {
  return (SUPPORTED_MINECRAFT_VERSIONS as readonly string[]).includes(version);
}

/**
 * Updates Minecraft Server configuration for the user's single bot.
 * Handles server switching (disconnects old connection before applying new settings).
 */
export async function updateBotServerConfig(
  userId: string,
  config: {
    serverHost: string;
    serverPort: number;
    minecraftVersion: string;
    username?: string;
    authMode?: 'offline' | 'microsoft';
    autoReconnect?: boolean;
  }
): Promise<{ success: boolean; bot?: UserBot; error?: string }> {
  const botDocId = `bot_${userId}`;
  const botRef = doc(db, 'bots', botDocId);

  // Validate version
  if (!isVersionSupported(config.minecraftVersion)) {
    return {
      success: false,
      error: `Unsupported Minecraft version "${config.minecraftVersion}". Supported versions: ${SUPPORTED_MINECRAFT_VERSIONS.join(', ')}`,
    };
  }

  // Validate port
  const port = Number(config.serverPort);
  if (isNaN(port) || port < 1 || port > 65535) {
    return { success: false, error: 'Invalid server port number (must be 1-65535).' };
  }

  let cleanHost = config.serverHost.trim();
  if (cleanHost.includes(':')) {
    const parts = cleanHost.split(':');
    cleanHost = parts[0].trim();
  }

  if (!cleanHost) {
    return { success: false, error: 'Server host address cannot be empty.' };
  }

  const updates: Partial<UserBot> = {
    serverHost: cleanHost,
    serverPort: port,
    minecraftVersion: config.minecraftVersion,
  };

  if (config.username) updates.username = config.username.trim();
  if (config.authMode) updates.authMode = config.authMode;
  if (config.autoReconnect !== undefined) updates.autoReconnect = config.autoReconnect;

  await updateDoc(botRef, updates);

  const updatedSnap = await getDoc(botRef);
  return { success: true, bot: updatedSnap.data() as UserBot };
}

/**
 * Updates bot operational status in Firestore (online, offline, connecting, suspended, error)
 */
export async function updateBotStatus(
  userId: string,
  status: BotLifecycleStatus,
  activeSessionId?: string | null,
  errorMessage?: string | null
): Promise<void> {
  const botDocId = `bot_${userId}`;
  const botRef = doc(db, 'bots', botDocId);

  const updates: Record<string, any> = {
    status,
    errorMessage: errorMessage || null,
  };

  if (status === 'online') {
    updates.lastOnlineAt = new Date().toISOString();
  }
  if (activeSessionId !== undefined) {
    updates.activeSessionId = activeSessionId;
  }

  await updateDoc(botRef, updates);
}
