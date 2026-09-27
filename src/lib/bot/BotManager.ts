import { AppSettings, BotMode, BotState } from '../../types/minecraft';
import { BotAdapter } from './BotAdapter';
import { MockBotAdapter } from './MockBotAdapter';
import { RemoteBotAdapter } from './RemoteBotAdapter';

const DEFAULT_SETTINGS: AppSettings = {
  botUsername: 'Youssef_Bot',
  serverHost: 'jeuxapk6.aternos.me',
  serverPort: 63257,
  minecraftVersion: '1.20.1',
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
  private currentMode: BotMode = 'mock';
  private settings: AppSettings = DEFAULT_SETTINGS;
  private settingsListeners: Set<(settings: AppSettings) => void> = new Set();
  private isClient = typeof window !== 'undefined';

  constructor() {
    this.mockAdapter = new MockBotAdapter();
    this.remoteAdapter = new RemoteBotAdapter('', '');

    if (this.isClient) {
      try {
        const saved = localStorage.getItem('mcc_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
          this.currentMode = this.settings.activeMode || 'mock';
        }
      } catch {
        // Fallback to defaults
      }
    }

    if (this.settings.remoteRuntimeUrl) {
      this.remoteAdapter.updateConfig(this.settings.remoteRuntimeUrl, this.settings.remoteApiKey);
    }
  }

  public getAdapter(): BotAdapter {
    return this.currentMode === 'remote' ? this.remoteAdapter : this.mockAdapter;
  }

  public async connectBot(): Promise<boolean> {
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
