export type BotStatus = 'online' | 'offline' | 'connecting' | 'error';
export type BotMode = 'mock' | 'remote';

export interface Coordinates {
  x: number;
  y: number;
  z: number;
  yaw?: number;
  pitch?: number;
}

export interface BotState {
  connected: boolean;
  mode: BotMode;
  username: string;
  status: BotStatus;
  health: number; // 0 - 20
  maxHealth: number;
  food: number; // 0 - 20
  saturation: number;
  armor: number; // 0 - 20
  oxygen: number; // 0 - 20
  position: Coordinates;
  velocity: { x: number; y: number; z: number };
  dimension: 'overworld' | 'the_nether' | 'the_end';
  biome: string;
  ping: number;
  currentTask: BotTask | null;
  selectedSlot: number; // 0 - 8
  sneaking: boolean;
  sprinting: boolean;
  isGrounded: boolean;
  lastUpdated: string;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface InventorySlot {
  id: number;
  name: string;
  displayName: string;
  count: number;
  maxStackSize: number;
  durability?: {
    current: number;
    max: number;
  };
  slotIndex: number;
  iconType: string;
  rarity?: ItemRarity;
  lore?: string[];
  enchantments?: string[];
}

export interface BotInventory {
  helmet: InventorySlot | null;
  chestplate: InventorySlot | null;
  leggings: InventorySlot | null;
  boots: InventorySlot | null;
  offhand: InventorySlot | null;
  hotbar: (InventorySlot | null)[]; // 9 items
  main: (InventorySlot | null)[]; // 27 items
}

export interface PlayerInfo {
  uuid: string;
  username: string;
  ping: number;
  health: number;
  position: Coordinates;
  distance: number;
  isOnline: boolean;
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  isOperator?: boolean;
}

export interface ServerInfo {
  host: string;
  port: number;
  version: string;
  motd: string;
  playersOnline: number;
  playersMax: number;
  tps: number;
  latency: number;
  uptime: string;
  isOnline: boolean;
  software?: string;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'BOT' | 'SERVER' | 'CHAT';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: 'bot' | 'server' | 'system' | 'ai';
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  sender: string;
  message: string;
  type: 'player' | 'system' | 'bot' | 'whisper' | 'command';
  isSelf?: boolean;
}

export type TaskType =
  | 'follow'
  | 'goto'
  | 'spawn'
  | 'find_block'
  | 'collect'
  | 'patrol'
  | 'guard'
  | 'stop';

export type TaskStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface BotTask {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0 - 100
  startedAt?: string;
  lastAction?: string;
  targetDetails?: string;
  targetCoords?: Coordinates;
  targetPlayer?: string;
}

export interface AIStructuredAction {
  action:
    | 'move_to'
    | 'follow_player'
    | 'collect_item'
    | 'mine_block'
    | 'stop'
    | 'chat'
    | 'look_at'
    | 'equip';
  target?: {
    x?: number;
    y?: number;
    z?: number;
    name?: string;
    count?: number;
    message?: string;
  };
  safetyRisk: 'safe' | 'caution' | 'dangerous';
  riskReason?: string;
  explanation: string;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserSession {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  token: string;
}

export interface AppSettings {
  botUsername: string;
  serverHost: string;
  serverPort: number;
  minecraftVersion: string;
  authType: 'offline' | 'microsoft';
  remoteRuntimeUrl: string;
  remoteApiKey: string;
  autoReconnect: boolean;
  reconnectDelaySeconds: number;
  commandPrefix: string;
  soundEffects: boolean;
  theme: 'dark' | 'light' | 'matrix';
  notificationsEnabled: boolean;
  activeMode: BotMode;
}
