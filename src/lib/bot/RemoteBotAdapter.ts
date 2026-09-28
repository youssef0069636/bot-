import {
  BotInventory,
  BotState,
  BotTask,
  ChatMessage,
  LogEntry,
  PlayerInfo,
  ServerInfo,
} from '../../types/minecraft';
import { BotAdapter } from './BotAdapter';

export interface RemoteConnectPayload {
  host?: string;
  port?: number;
  username?: string;
  version?: string;
  authType?: string;
}

export class RemoteBotAdapter implements BotAdapter {
  public readonly mode = 'remote';

  private endpointUrl: string = '';
  private apiKey: string = '';
  private state: BotState;
  private pollInterval: NodeJS.Timeout | null = null;

  private listeners: Set<(state: BotState) => void> = new Set();
  private logListeners: Set<(log: LogEntry) => void> = new Set();
  private chatListeners: Set<(msg: ChatMessage) => void> = new Set();

  private cachedInventory: BotInventory = {
    helmet: null,
    chestplate: null,
    leggings: null,
    boots: null,
    offhand: null,
    hotbar: Array(9).fill(null),
    main: Array(27).fill(null),
  };
  private cachedPlayers: PlayerInfo[] = [];
  private cachedServerInfo: ServerInfo;
  private cachedLogs: LogEntry[] = [];
  private cachedChat: ChatMessage[] = [];

  public lastError: string | null = null;
  public lastDisconnectReason: string | null = null;

  constructor(endpointUrl: string = '', apiKey: string = '') {
    this.endpointUrl = endpointUrl ? endpointUrl.replace(/\/$/, '') : '';
    this.apiKey = apiKey;

    this.state = {
      connected: false,
      mode: 'remote',
      username: 'ControlDeckBot',
      status: 'offline',
      health: 20,
      maxHealth: 20,
      food: 20,
      saturation: 5,
      armor: 0,
      oxygen: 20,
      position: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      dimension: 'overworld',
      biome: 'Minecraft Biome',
      ping: 0,
      currentTask: null,
      selectedSlot: 0,
      sneaking: false,
      sprinting: false,
      isGrounded: true,
      lastUpdated: new Date().toISOString(),
    };

    this.cachedServerInfo = {
      host: 'minecraft-server',
      port: 25565,
      version: '1.21.1',
      motd: 'Live Minecraft Server Gateway',
      playersOnline: 0,
      playersMax: 0,
      tps: 20.0,
      latency: 0,
      uptime: '0m',
      isOnline: false,
    };

    // Initial state check on startup
    this.checkInitialState();
    this.setupVisibilityListener();
  }

  public updateConfig(url: string, apiKey: string) {
    this.endpointUrl = url ? url.replace(/\/$/, '') : '';
    this.apiKey = apiKey;
    this.fetchState();
  }

  private checkInitialState() {
    this.fetchState().then(() => {
      if (this.state.connected) {
        this.startPolling();
      }
    });
  }

  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.stopPolling();
        } else if (this.state.connected) {
          this.fetchState();
          this.startPolling();
        }
      });
    }
  }

  public startPolling(intervalMs: number = 3000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      // Do not spam serverless if bot is offline
      if (!this.state.connected && this.state.status !== 'connecting') {
        this.stopPolling();
        return;
      }
      this.fetchState();
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    const targetUrl = this.endpointUrl ? `${this.endpointUrl}${path}` : path;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers,
      });

      if (!res.ok) {
        throw new Error(`Remote runtime error: ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Suppress spamming logs if server is momentarily idle
      return null;
    }
  }

  public async fetchState() {
    const data = await this.request<{
      state: BotState;
      status?: {
        connected: boolean;
        isConnecting: boolean;
        lastError: string | null;
        lastDisconnectReason: string | null;
      };
      inventory?: BotInventory;
      players?: PlayerInfo[];
      server?: ServerInfo;
      logs?: LogEntry[];
      chat?: ChatMessage[];
    }>('/api/bot/state');

    if (data && data.state) {
      this.state = { ...data.state, mode: 'remote' };
      if (data.status) {
        this.lastError = data.status.lastError;
        this.lastDisconnectReason = data.status.lastDisconnectReason;
      }
      if (data.inventory) this.cachedInventory = data.inventory;
      if (data.players) this.cachedPlayers = data.players;
      if (data.server) this.cachedServerInfo = data.server;
      if (data.logs) {
        // Merge logs without duplicating
        this.cachedLogs = data.logs;
      }
      if (data.chat) this.cachedChat = data.chat;
      this.notifyState();

      // Stop polling if bot is offline to protect serverless quotas
      if (!data.state.connected && this.state.status !== 'connecting') {
        this.stopPolling();
      }
    } else {
      this.stopPolling();
    }
  }

  private notifyState() {
    this.state.lastUpdated = new Date().toISOString();
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  public addLog(level: LogEntry['level'], message: string, source: LogEntry['source'] = 'bot') {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toTimeString().split(' ')[0],
      level,
      message,
      source,
    };
    this.cachedLogs.unshift(entry);
    if (this.cachedLogs.length > 500) this.cachedLogs.pop();
    this.logListeners.forEach((cb) => cb(entry));
  }

  // --- BotAdapter implementation ---

  public async connect(params?: RemoteConnectPayload): Promise<boolean> {
    this.state.status = 'connecting';
    this.lastError = null;
    this.lastDisconnectReason = null;
    this.notifyState();

    this.addLog('INFO', 'Initiating live Mineflayer bot connection...', 'bot');

    const res = await this.request<{ success: boolean; message?: string; error?: string }>('/api/bot/connect', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });

    if (res && res.success) {
      this.state.connected = true;
      this.state.status = 'online';
      this.addLog('SUCCESS', res.message || 'Connected to Minecraft server!', 'bot');
      await this.fetchState();
      this.startPolling(2500);
      return true;
    } else {
      this.state.connected = false;
      this.state.status = 'error';
      this.stopPolling();
      const errMsg = res?.message || res?.error || 'Could not connect to server. Check IP, Port, and Cracked status.';
      this.lastError = errMsg;
      this.addLog('ERROR', errMsg, 'system');
      this.notifyState();
      return false;
    }
  }

  public async disconnect(): Promise<boolean> {
    this.stopPolling();
    await this.request('/api/bot/disconnect', { method: 'POST' });
    this.state.connected = false;
    this.state.status = 'offline';
    this.notifyState();
    return true;
  }

  public move(direction: 'forward' | 'back' | 'left' | 'right', active: boolean) {
    this.request('/api/bot/move', {
      method: 'POST',
      body: JSON.stringify({ direction, active }),
    });
  }

  public jump() {
    this.request('/api/bot/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'jump' }),
    });
  }

  public sneak(active: boolean) {
    this.request('/api/bot/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'sneak', active }),
    });
  }

  public sprint(active: boolean) {
    this.request('/api/bot/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'sprint', active }),
    });
  }

  public look(yaw: number, pitch: number) {
    this.request('/api/bot/look', {
      method: 'POST',
      body: JSON.stringify({ yaw, pitch }),
    });
  }

  public async attack(): Promise<{ success: boolean; target?: string }> {
    const res = await this.request<{ success: boolean; target?: string }>('/api/bot/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'attack' }),
    });
    return res || { success: true };
  }

  public async interact(): Promise<{ success: boolean; action?: string }> {
    const res = await this.request<{ success: boolean; action?: string }>('/api/bot/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'interact' }),
    });
    return res || { success: true };
  }

  public selectSlot(slot: number) {
    this.request('/api/bot/inventory/slot', {
      method: 'POST',
      body: JSON.stringify({ slot }),
    });
  }

  public async dropItem(slotIndex?: number): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/bot/inventory/drop', {
      method: 'POST',
      body: JSON.stringify({ slot: slotIndex }),
    });
    return res?.success || false;
  }

  public async equipItem(sourceSlot: number, targetSlot: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'offhand'): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/bot/inventory/equip', {
      method: 'POST',
      body: JSON.stringify({ sourceSlot, targetSlot }),
    });
    return res?.success || false;
  }

  public swapHand() {
    this.request('/api/bot/inventory/swap-hand', { method: 'POST' });
  }

  public async chat(message: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/bot/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res?.success || false;
  }

  public async restart(): Promise<boolean> {
    await this.disconnect();
    await new Promise((r) => setTimeout(r, 2000));
    return this.connect();
  }

  public getStatus(): string {
    return this.state.status;
  }

  public getPosition() {
    return { ...this.state.position };
  }

  public getHealth(): number {
    return this.state.health;
  }

  public getFood(): number {
    return this.state.food;
  }

  public getVersion(): string {
    return this.cachedServerInfo.version || '1.20.1';
  }

  public async sendChat(message: string): Promise<boolean> {
    return this.chat(message);
  }

  public getConsole(limit = 100): LogEntry[] {
    return this.getLogs(limit);
  }

  public async executeCommand(command: string): Promise<{ success: boolean; output: string }> {
    const res = await this.request<{ success: boolean; output: string }>('/api/bot/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    return res || { success: false, output: 'No response from runtime.' };
  }

  public getState(): BotState {
    return { ...this.state };
  }

  public getInventory(): BotInventory {
    return this.cachedInventory;
  }

  public getPlayers(): PlayerInfo[] {
    return this.cachedPlayers;
  }

  public getServerInfo(): ServerInfo {
    return this.cachedServerInfo;
  }

  public getLogs(limit = 100): LogEntry[] {
    return this.cachedLogs.slice(0, limit);
  }

  public getChat(limit = 100): ChatMessage[] {
    return this.cachedChat.slice(0, limit);
  }

  public clearLogs() {
    this.cachedLogs = [];
    this.request('/api/bot/logs/clear', { method: 'POST' });
  }

  public async startTask(task: Omit<BotTask, 'id' | 'status' | 'progress' | 'startedAt'>): Promise<BotTask> {
    const res = await this.request<BotTask>('/api/bot/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (res) return res;
    throw new Error('Failed to start task on runtime');
  }

  public async pauseTask(taskId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/bot/tasks/${taskId}/pause`, { method: 'POST' });
    return res?.success || false;
  }

  public async resumeTask(taskId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/bot/tasks/${taskId}/resume`, { method: 'POST' });
    return res?.success || false;
  }

  public async stopTask(taskId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/bot/tasks/${taskId}/stop`, { method: 'POST' });
    return res?.success || false;
  }

  public subscribe(callback: (state: BotState) => void): () => void {
    this.listeners.add(callback);
    callback({ ...this.state });
    return () => this.listeners.delete(callback);
  }

  public onLog(callback: (log: LogEntry) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  public onChat(callback: (msg: ChatMessage) => void): () => void {
    this.chatListeners.add(callback);
    return () => this.chatListeners.delete(callback);
  }
}
