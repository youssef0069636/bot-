import {
  BotInventory,
  BotState,
  BotTask,
  ChatMessage,
  Coordinates,
  LogEntry,
  PlayerInfo,
  ServerInfo,
} from '../../types/minecraft';

export interface BotMoveParams {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
}

export interface BotAdapter {
  readonly mode: 'mock' | 'remote';

  // Lifecycle
  connect(params?: any): Promise<boolean>;
  disconnect(): Promise<boolean>;
  restart(): Promise<boolean>;
  getStatus(): string;
  getPosition(): Coordinates;
  getHealth(): number;
  getFood(): number;
  getVersion(): string;
  sendChat(message: string): Promise<boolean>;
  getConsole(limit?: number): LogEntry[];
  
  // Movement & physics
  move(direction: 'forward' | 'back' | 'left' | 'right', active: boolean): void;
  jump(): void;
  sneak(active: boolean): void;
  sprint(active: boolean): void;
  look(yaw: number, pitch: number): void;
  
  // Interactions
  attack(): Promise<{ success: boolean; target?: string }>;
  interact(): Promise<{ success: boolean; action?: string }>;
  selectSlot(slot: number): void;
  dropItem(slotIndex?: number): Promise<boolean>;
  equipItem(sourceSlot: number, targetSlot: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'offhand'): Promise<boolean>;
  swapHand(): void;

  // Communication & Commands
  chat(message: string): Promise<boolean>;
  executeCommand(command: string): Promise<{ success: boolean; output: string }>;

  // State inspection
  getState(): BotState;
  getInventory(): BotInventory;
  getPlayers(): PlayerInfo[];
  getServerInfo(): ServerInfo;
  getLogs(limit?: number): LogEntry[];
  getChat(limit?: number): ChatMessage[];
  clearLogs(): void;

  // Task Automation
  startTask(task: Omit<BotTask, 'id' | 'status' | 'progress' | 'startedAt'>): Promise<BotTask>;
  pauseTask(taskId: string): Promise<boolean>;
  resumeTask(taskId: string): Promise<boolean>;
  stopTask(taskId: string): Promise<boolean>;

  // Event Subscription
  subscribe(callback: (state: BotState) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
  onChat(callback: (msg: ChatMessage) => void): () => void;
}
