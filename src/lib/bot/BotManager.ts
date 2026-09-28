import { AppSettings, BotMode, BotState } from '../../types/minecraft';
import { BotAdapter } from './BotAdapter';
import { MockBotAdapter } from './MockBotAdapter';
import { RemoteBotAdapter } from './RemoteBotAdapter';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserBot } from '../../types/saas';

const DEFAULT_SETTINGS: AppSettings = {
  botUsername: 'Youssef_Bot',
  serverHost: 'jeuxapk6.aternos.me',
  serverPort: 63257,
  minecraftVersion: '1.21.1',
  authType: 'offline',
  remoteRuntimeUrl: '',
  remoteApiKey: '',
  autoReconnect: true,
  reconnectDelaySeconds: 5,
  commandPrefix: '!',
  soundEffects: true,
  theme: 'dark',
  notificationsEnabled: true,
  activeMode: 'remote',
};

class BotManagerService {
  private mockAdapter: MockBotAdapter;
  private remoteAdapter: RemoteBotAdapter;
  private currentMode: BotMode = 'remote';
  private settings: AppSettings = DEFAULT_SETTINGS;
  private settingsListeners: Set<(settings: AppSettings) => void> = new Set();
  private isClient = typeof window !== 'undefined';
  private activeUserId: string | null = null;

  constructor() {
    this.mockAdapter = new MockBotAdapter();
    this.remoteAdapter = new RemoteBotAdapter('', '');

    if (this.isClient) {
      try {
        const saved = localStorage.getItem('mcc_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
          this.currentMode = this.settings.activeMode || 'remote';
        }
      } catch {
        // Fallback to defaults
      }
    }

    if (this.settings.remoteRuntimeUrl) {
      this.remoteAdapter.updateConfig(this.settings.remoteRuntimeUrl, this.settings.remoteApiKey);
    }
  }

  public setActiveUserId(userId: string | null) {
    this.activeUserId = userId;
  }

  public getAdapter(): BotAdapter {
    return this.currentMode === 'remote' ? this.remoteAdapter : this.mockAdapter;
  }

  /**
   * Syncs latest bot configuration and server credentials from Firestore before connecting.
   */
  public async syncBotConfigFromFirestore(userId?: string): Promise<UserBot | null> {
    const uid = userId || this.activeUserId;
    if (!uid) return null;

    try {
      const botDocRef = doc(db, 'bots', `bot_${uid}`);
      const snap = await getDoc(botDocRef);
      if (snap.exists()) {
        const botData = snap.data() as UserBot;
        this.updateSettings({
          botUsername: botData.username || this.settings.botUsername,
          serverHost: botData.serverHost || this.settings.serverHost,
          serverPort: botData.serverPort || this.settings.serverPort,
          minecraftVersion: botData.minecraftVersion || this.settings.minecraftVersion,
          authType: botData.authMode || this.settings.authType,
          autoReconnect: botData.autoReconnect ?? this.settings.autoReconnect,
        });
        return botData;
      }
    } catch (err) {
      console.warn('Could not sync bot config from Firestore:', err);
    }
    return null;
  }

  /**
   * Persists bot configuration (such as bot username, server host/port, etc.) to Firestore and updates local settings.
   */
  public async updateBotConfig(
    userId: string,
    updates: {
      username?: string;
      serverHost?: string;
      serverPort?: number;
      minecraftVersion?: string;
      authMode?: 'offline' | 'microsoft';
      autoReconnect?: boolean;
    }
  ): Promise<{ success: boolean; bot?: UserBot; error?: string }> {
    const uid = userId || this.activeUserId;
    if (!uid) {
      return { success: false, error: 'User ID is required to update bot configuration.' };
    }

    if (updates.username !== undefined) {
      const trimmed = updates.username.trim();
      if (!trimmed) {
        return { success: false, error: 'Bot username cannot be empty.' };
      }
      if (trimmed.length < 3) {
        return { success: false, error: 'Bot username must be at least 3 characters.' };
      }
      if (trimmed.length > 16) {
        return { success: false, error: 'Bot username cannot exceed 16 characters.' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return {
          success: false,
          error: 'Bot username can only contain letters, numbers, and underscores (_).',
        };
      }
      updates.username = trimmed;
    }

    try {
      const botDocRef = doc(db, 'bots', `bot_${uid}`);
      const cleanData: Record<string, any> = {
        ...updates,
        userId: uid,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(botDocRef, cleanData, { merge: true });

      // Update local BotManager settings
      const settingsUpdates: Partial<AppSettings> = {};
      if (updates.username) settingsUpdates.botUsername = updates.username;
      if (updates.serverHost) settingsUpdates.serverHost = updates.serverHost;
      if (updates.serverPort) settingsUpdates.serverPort = updates.serverPort;
      if (updates.minecraftVersion) settingsUpdates.minecraftVersion = updates.minecraftVersion;
      if (updates.authMode) settingsUpdates.authType = updates.authMode;
      if (updates.autoReconnect !== undefined) settingsUpdates.autoReconnect = updates.autoReconnect;

      this.updateSettings(settingsUpdates);

      const snap = await getDoc(botDocRef);
      const bot = snap.exists() ? (snap.data() as UserBot) : undefined;

      return { success: true, bot };
    } catch (err: any) {
      console.error('Failed to update bot config in Firestore:', err);
      return { success: false, error: err?.message || 'Failed to persist bot configuration in Firestore.' };
    }
  }

  public async connectBot(userId?: string): Promise<boolean> {
    const uid = userId || this.activeUserId;
    if (uid) {
      await this.syncBotConfigFromFirestore(uid);
    }

    const adapter = this.getAdapter();
    if (this.currentMode === 'remote') {
      return (this.remoteAdapter as any).connect({
        host: this.settings.serverHost,
        port: this.settings.serverPort,
        username: this.settings.botUsername,
        version: this.settings.minecraftVersion,
        authType: this.settings.authType,
      });
    }
    return adapter.connect();
  }

  public getMode(): BotMode {
    return this.currentMode;
  }

  public setMode(mode: BotMode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.settings.activeMode = mode;
    this.saveSettings();
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (partial.activeMode !== undefined) {
      this.currentMode = partial.activeMode;
    }
    if (partial.remoteRuntimeUrl !== undefined || partial.remoteApiKey !== undefined) {
      this.remoteAdapter.updateConfig(
        this.settings.remoteRuntimeUrl,
        this.settings.remoteApiKey
      );
    }
    this.saveSettings();
  }

  private saveSettings() {
    if (this.isClient) {
      try {
        localStorage.setItem('mcc_settings', JSON.stringify(this.settings));
      } catch {
        // LocalStorage quota or unavailable
      }
    }
    this.settingsListeners.forEach((cb) => cb({ ...this.settings }));
  }

  public onSettingsChange(callback: (settings: AppSettings) => void): () => void {
    this.settingsListeners.add(callback);
    callback({ ...this.settings });
    return () => this.settingsListeners.delete(callback);
  }

  public subscribeState(callback: (state: BotState) => void): () => void {
    let unsubscribeAdapter = this.getAdapter().subscribe(callback);

    const checkAdapter = (settings: AppSettings) => {
      unsubscribeAdapter();
      unsubscribeAdapter = this.getAdapter().subscribe(callback);
    };

    const unsubscribeSettings = this.onSettingsChange(checkAdapter);

    return () => {
      unsubscribeAdapter();
      unsubscribeSettings();
    };
  }
}

export const botManager = new BotManagerService();
