import {
  BotInventory,
  BotState,
  BotTask,
  ChatMessage,
  InventorySlot,
  LogEntry,
  PlayerInfo,
  ServerInfo,
} from '../../types/minecraft';
import { BotAdapter } from './BotAdapter';

export class MockBotAdapter implements BotAdapter {
  public readonly mode = 'mock';

  private state: BotState;
  private inventory: BotInventory;
  private players: PlayerInfo[];
  private serverInfo: ServerInfo;
  private logs: LogEntry[] = [];
  private chatMessages: ChatMessage[] = [];

  private listeners: Set<(state: BotState) => void> = new Set();
  private logListeners: Set<(log: LogEntry) => void> = new Set();
  private chatListeners: Set<(msg: ChatMessage) => void> = new Set();

  private movementLoop: NodeJS.Timeout | null = null;
  private taskInterval: NodeJS.Timeout | null = null;
  private ambientInterval: NodeJS.Timeout | null = null;

  private activeMoves = {
    forward: false,
    back: false,
    left: false,
    right: false,
  };

  constructor() {
    this.state = {
      connected: true,
      mode: 'mock',
      username: 'Bot_ControlDeck',
      status: 'online',
      health: 18,
      maxHealth: 20,
      food: 19,
      saturation: 12,
      armor: 15,
      oxygen: 20,
      position: { x: 128.4, y: 64.0, z: -212.6, yaw: 45.0, pitch: -2.5 },
      velocity: { x: 0, y: 0, z: 0 },
      dimension: 'overworld',
      biome: 'Plains (Sunflower Plains)',
      ping: 24,
      currentTask: null,
      selectedSlot: 0,
      sneaking: false,
      sprinting: false,
      isGrounded: true,
      lastUpdated: new Date().toISOString(),
    };

    this.inventory = this.createDefaultInventory();
    this.players = this.createDefaultPlayers();
    this.serverInfo = {
      host: 'mc.hypixel.net',
      port: 25565,
      version: 'Paper 1.21.1',
      motd: '§6★ §eMinecraft Control Center §6★ §7[1.20-1.21.x]\n§aSurvival & Creative Hub §f| §bOnline 24/7',
      playersOnline: 6,
      playersMax: 50,
      tps: 19.98,
      latency: 28,
      uptime: '14d 6h 32m',
      isOnline: true,
      software: 'PaperMC (git-Paper-128)',
    };

    this.seedInitialLogs();
    this.seedInitialChat();
    this.startAmbientSimulation();
  }

  private createDefaultInventory(): BotInventory {
    const hotbar: (InventorySlot | null)[] = [
      {
        id: 1,
        name: 'diamond_sword',
        displayName: 'Diamond Sword',
        count: 1,
        maxStackSize: 1,
        durability: { current: 1420, max: 1561 },
        slotIndex: 0,
        iconType: 'sword',
        rarity: 'rare',
        enchantments: ['Sharpness V', 'Unbreaking III', 'Mending'],
      },
      {
        id: 2,
        name: 'diamond_pickaxe',
        displayName: 'Diamond Pickaxe',
        count: 1,
        maxStackSize: 1,
        durability: { current: 1200, max: 1561 },
        slotIndex: 1,
        iconType: 'pickaxe',
        rarity: 'rare',
        enchantments: ['Efficiency V', 'Fortune III'],
      },
      {
        id: 3,
        name: 'cooked_beef',
        displayName: 'Steak',
        count: 48,
        maxStackSize: 64,
        slotIndex: 2,
        iconType: 'food',
        rarity: 'common',
      },
      {
        id: 4,
        name: 'golden_apple',
        displayName: 'Golden Apple',
        count: 8,
        maxStackSize: 64,
        slotIndex: 3,
        iconType: 'apple',
        rarity: 'rare',
      },
      {
        id: 5,
        name: 'bow',
        displayName: 'Power Bow',
        count: 1,
        maxStackSize: 1,
        durability: { current: 340, max: 384 },
        slotIndex: 4,
        iconType: 'bow',
        rarity: 'uncommon',
        enchantments: ['Power IV', 'Flame'],
      },
      {
        id: 6,
        name: 'water_bucket',
        displayName: 'Water Bucket',
        count: 1,
        maxStackSize: 1,
        slotIndex: 5,
        iconType: 'bucket',
        rarity: 'common',
      },
      {
        id: 7,
        name: 'cobblestone',
        displayName: 'Cobblestone',
        count: 64,
        maxStackSize: 64,
        slotIndex: 6,
        iconType: 'block',
        rarity: 'common',
      },
      {
        id: 8,
        name: 'torch',
        displayName: 'Torch',
        count: 32,
        maxStackSize: 64,
        slotIndex: 7,
        iconType: 'torch',
        rarity: 'common',
      },
      {
        id: 9,
        name: 'arrow',
        displayName: 'Arrow',
        count: 64,
        maxStackSize: 64,
        slotIndex: 8,
        iconType: 'arrow',
        rarity: 'common',
      },
    ];

    const main: (InventorySlot | null)[] = Array(27).fill(null);
    main[0] = { id: 10, name: 'iron_ingot', displayName: 'Iron Ingot', count: 32, maxStackSize: 64, slotIndex: 9, iconType: 'ingot', rarity: 'common' };
    main[1] = { id: 11, name: 'gold_ingot', displayName: 'Gold Ingot', count: 14, maxStackSize: 64, slotIndex: 10, iconType: 'ingot', rarity: 'uncommon' };
    main[2] = { id: 12, name: 'diamond', displayName: 'Diamond', count: 6, maxStackSize: 64, slotIndex: 11, iconType: 'gem', rarity: 'rare' };
    main[3] = { id: 13, name: 'ender_pearl', displayName: 'Ender Pearl', count: 12, maxStackSize: 16, slotIndex: 12, iconType: 'pearl', rarity: 'uncommon' };
    main[4] = { id: 14, name: 'oak_log', displayName: 'Oak Wood Log', count: 52, maxStackSize: 64, slotIndex: 13, iconType: 'wood', rarity: 'common' };
    main[5] = { id: 15, name: 'shield', displayName: 'Wooden Shield', count: 1, maxStackSize: 1, durability: { current: 280, max: 336 }, slotIndex: 14, iconType: 'shield', rarity: 'common' };

    return {
      helmet: { id: 20, name: 'diamond_helmet', displayName: 'Diamond Helmet', count: 1, maxStackSize: 1, durability: { current: 310, max: 363 }, slotIndex: 36, iconType: 'armor_helmet', rarity: 'rare', enchantments: ['Protection IV'] },
      chestplate: { id: 21, name: 'netherite_chestplate', displayName: 'Netherite Chestplate', count: 1, maxStackSize: 1, durability: { current: 560, max: 592 }, slotIndex: 37, iconType: 'armor_chest', rarity: 'epic', enchantments: ['Protection IV', 'Thorns III', 'Unbreaking III'] },
      leggings: { id: 22, name: 'diamond_leggings', displayName: 'Diamond Leggings', count: 1, maxStackSize: 1, durability: { current: 440, max: 495 }, slotIndex: 38, iconType: 'armor_legs', rarity: 'rare', enchantments: ['Protection IV'] },
      boots: { id: 23, name: 'diamond_boots', displayName: 'Diamond Boots', count: 1, maxStackSize: 1, durability: { current: 390, max: 429 }, slotIndex: 39, iconType: 'armor_boots', rarity: 'rare', enchantments: ['Feather Falling IV'] },
      offhand: { id: 24, name: 'totem_of_undying', displayName: 'Totem of Undying', count: 1, maxStackSize: 1, slotIndex: 40, iconType: 'totem', rarity: 'epic' },
      hotbar,
      main,
    };
  }

  private createDefaultPlayers(): PlayerInfo[] {
    return [
      {
        uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
        username: 'Steve',
        ping: 18,
        health: 20,
        position: { x: 132.0, y: 64.0, z: -208.5 },
        distance: 5.6,
        isOnline: true,
        gamemode: 'survival',
        isOperator: false,
      },
      {
        uuid: 'ec561538-f3fd-461d-a0e3-bda3597b8f98',
        username: 'Alex_Builder',
        ping: 32,
        health: 16,
        position: { x: 145.2, y: 68.0, z: -195.0 },
        distance: 24.3,
        isOnline: true,
        gamemode: 'survival',
        isOperator: false,
      },
      {
        uuid: '853c80ef-3c37-49fd-aa49-938b674adae6',
        username: 'TechnoCraft',
        ping: 45,
        health: 20,
        position: { x: 98.0, y: 72.0, z: -305.1 },
        distance: 98.2,
        isOnline: true,
        gamemode: 'survival',
        isOperator: true,
      },
      {
        uuid: '45f93539-0820-4e36-963e-48a586d34e2c',
        username: 'Miner49er',
        ping: 60,
        health: 14,
        position: { x: 120.5, y: 32.0, z: -210.0 },
        distance: 33.1,
        isOnline: true,
        gamemode: 'survival',
      },
      {
        uuid: '2b78b09b-648b-4b1f-bc45-09559c5d19e9',
        username: 'RedstoneWiz',
        ping: 22,
        health: 20,
        position: { x: 180.0, y: 65.0, z: -160.0 },
        distance: 73.5,
        isOnline: true,
        gamemode: 'creative',
        isOperator: true,
      },
    ];
  }

  private seedInitialLogs() {
    const now = new Date();
    const subSeconds = (s: number) => new Date(now.getTime() - s * 1000).toTimeString().split(' ')[0];

    this.logs = [
      { id: '1', timestamp: subSeconds(50), level: 'INFO', message: 'MockBotAdapter initialized in demo mode.', source: 'system' },
      { id: '2', timestamp: subSeconds(48), level: 'SERVER', message: 'Connecting to mock gateway at mc.hypixel.net:25565...', source: 'server' },
      { id: '3', timestamp: subSeconds(45), level: 'SUCCESS', message: 'Handshake complete. Protocol 767 (Minecraft 1.21.1)', source: 'bot' },
      { id: '4', timestamp: subSeconds(42), level: 'BOT', message: 'Bot_ControlDeck spawned in World [Overworld] at (128, 64, -212)', source: 'bot' },
      { id: '5', timestamp: subSeconds(35), level: 'INFO', message: 'Chunk render distance synchronized (12 chunks loaded)', source: 'system' },
      { id: '6', timestamp: subSeconds(25), level: 'CHAT', message: '<Steve> Welcome to the base, bot!', source: 'server' },
      { id: '7', timestamp: subSeconds(18), level: 'BOT', message: 'Physics engine tick active. 20.0 TPS stable.', source: 'bot' },
      { id: '8', timestamp: subSeconds(10), level: 'INFO', message: 'Ready for user keyboard, touch & AI assistant controls.', source: 'system' },
    ];
  }

  private seedInitialChat() {
    const subSeconds = (s: number) => new Date(Date.now() - s * 1000).toTimeString().split(' ')[0];
    this.chatMessages = [
      { id: 'c1', timestamp: subSeconds(120), sender: '[Server]', message: 'Server uptime: 14 days. Welcome back!', type: 'system' },
      { id: 'c2', timestamp: subSeconds(90), sender: 'Steve', message: 'Hey everyone, check the north chests for iron.', type: 'player' },
      { id: 'c3', timestamp: subSeconds(60), sender: 'Alex_Builder', message: 'I finished the roof on the armory.', type: 'player' },
      { id: 'c4', timestamp: subSeconds(25), sender: 'Steve', message: 'Welcome to the base, bot!', type: 'player' },
    ];
  }

  private startAmbientSimulation() {
    // Ambient player movements and occasional server ticks
    this.ambientInterval = setInterval(() => {
      if (!this.state.connected) return;

      // Small jitter to simulate player radar
      this.players = this.players.map((p) => {
        const dx = (Math.random() - 0.5) * 0.4;
        const dz = (Math.random() - 0.5) * 0.4;
        const newX = parseFloat((p.position.x + dx).toFixed(2));
        const newZ = parseFloat((p.position.z + dz).toFixed(2));
        const dist = parseFloat(
          Math.hypot(newX - this.state.position.x, newZ - this.state.position.z).toFixed(1)
        );
        return {
          ...p,
          position: { ...p.position, x: newX, z: newZ },
          distance: dist,
        };
      });

      // Update ping jitter
      this.state.ping = Math.max(16, Math.min(65, this.state.ping + Math.floor(Math.random() * 7 - 3)));
      this.notifyState();
    }, 4000);
  }

  private notifyState() {
    this.state.lastUpdated = new Date().toISOString();
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  private addLog(level: LogEntry['level'], message: string, source: LogEntry['source'] = 'bot') {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toTimeString().split(' ')[0],
      level,
      message,
      source,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 500) this.logs.pop();
    this.logListeners.forEach((cb) => cb(entry));
  }

  // --- BOT ADAPTER IMPLEMENTATION ---

  public async connect(): Promise<boolean> {
    this.state.status = 'connecting';
    this.addLog('INFO', 'Initiating simulated bot connection...', 'bot');
    this.notifyState();

    await new Promise((r) => setTimeout(r, 600));
    this.state.connected = true;
    this.state.status = 'online';
    this.addLog('SUCCESS', `Bot ${this.state.username} joined server in DEMO MODE.`, 'bot');
    this.notifyState();
    return true;
  }

  public async disconnect(): Promise<boolean> {
    this.state.connected = false;
    this.state.status = 'offline';
    this.stopMovementLoop();
    this.addLog('WARN', `Bot ${this.state.username} disconnected from server.`, 'bot');
    this.notifyState();
    return true;
  }

  public move(direction: 'forward' | 'back' | 'left' | 'right', active: boolean) {
    if (!this.state.connected) return;
    this.activeMoves[direction] = active;

    const anyActive = Object.values(this.activeMoves).some(Boolean);
    if (anyActive && !this.movementLoop) {
      this.startMovementLoop();
    } else if (!anyActive && this.movementLoop) {
      this.stopMovementLoop();
    }
  }

  private startMovementLoop() {
    this.movementLoop = setInterval(() => {
      const speed = this.state.sprinting ? 0.32 : this.state.sneaking ? 0.08 : 0.20;
      let dx = 0;
      let dz = 0;

      // Compass yaw to direction
      const rad = ((this.state.position.yaw || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      if (this.activeMoves.forward) {
        dx -= sin * speed;
        dz += cos * speed;
      }
      if (this.activeMoves.back) {
        dx += sin * speed;
        dz -= cos * speed;
      }
      if (this.activeMoves.left) {
        dx -= cos * speed;
        dz -= sin * speed;
      }
      if (this.activeMoves.right) {
        dx += cos * speed;
        dz += sin * speed;
      }

      this.state.position.x = parseFloat((this.state.position.x + dx).toFixed(2));
      this.state.position.z = parseFloat((this.state.position.z + dz).toFixed(2));
      this.state.velocity = { x: parseFloat(dx.toFixed(2)), y: 0, z: parseFloat(dz.toFixed(2)) };

      this.notifyState();
    }, 100);
  }

  private stopMovementLoop() {
    if (this.movementLoop) {
      clearInterval(this.movementLoop);
      this.movementLoop = null;
    }
    this.state.velocity = { x: 0, y: 0, z: 0 };
    this.notifyState();
  }

  public jump() {
    if (!this.state.connected) return;
    this.state.isGrounded = false;
    this.state.position.y = parseFloat((this.state.position.y + 1.25).toFixed(2));
    this.addLog('BOT', `Jump executed at Y=${this.state.position.y}`);
    this.notifyState();

    setTimeout(() => {
      this.state.position.y = Math.max(64, parseFloat((this.state.position.y - 1.25).toFixed(2)));
      this.state.isGrounded = true;
      this.notifyState();
    }, 350);
  }

  public sneak(active: boolean) {
    this.state.sneaking = active;
    if (active) this.state.sprinting = false;
    this.notifyState();
  }

  public sprint(active: boolean) {
    this.state.sprinting = active;
    if (active) this.state.sneaking = false;
    this.notifyState();
  }

  public look(yaw: number, pitch: number) {
    this.state.position.yaw = parseFloat(yaw.toFixed(1));
    this.state.position.pitch = Math.max(-90, Math.min(90, parseFloat(pitch.toFixed(1))));
    this.notifyState();
  }

  public async attack(): Promise<{ success: boolean; target?: string }> {
    if (!this.state.connected) return { success: false };
    const selectedItem = this.inventory.hotbar[this.state.selectedSlot];
    const weaponName = selectedItem ? selectedItem.displayName : 'Fist';

    // Find nearest player or mob within 4 blocks
    const target = this.players.find((p) => p.distance < 4.5);
    const targetDesc = target ? target.username : 'air (swing)';

    this.addLog('BOT', `Attacked with ${weaponName} -> Hit ${targetDesc}`);

    if (target) {
      target.health = Math.max(0, target.health - (selectedItem?.name.includes('sword') ? 7 : 2));
    }

    return { success: true, target: targetDesc };
  }

  public async interact(): Promise<{ success: boolean; action?: string }> {
    if (!this.state.connected) return { success: false };
    const selectedItem = this.inventory.hotbar[this.state.selectedSlot];

    if (selectedItem?.name === 'cooked_beef' || selectedItem?.name === 'golden_apple') {
      if (this.state.food < 20 || selectedItem.name === 'golden_apple') {
        this.state.food = Math.min(20, this.state.food + 8);
        this.state.health = Math.min(20, this.state.health + (selectedItem.name === 'golden_apple' ? 6 : 2));
        selectedItem.count -= 1;
        if (selectedItem.count <= 0) {
          this.inventory.hotbar[this.state.selectedSlot] = null;
        }
        this.addLog('SUCCESS', `Ate 1x ${selectedItem.displayName}. Health & food restored!`);
        this.notifyState();
        return { success: true, action: `Consumed ${selectedItem.displayName}` };
      }
    }

    this.addLog('BOT', `Interacted with target block at (${this.state.position.x}, ${this.state.position.y}, ${this.state.position.z})`);
    return { success: true, action: 'Interact block' };
  }

  public selectSlot(slot: number) {
    if (slot >= 0 && slot <= 8) {
      this.state.selectedSlot = slot;
      const item = this.inventory.hotbar[slot];
      this.addLog('BOT', `Equipped hotbar slot ${slot + 1}: ${item ? item.displayName : 'Empty'}`);
      this.notifyState();
    }
  }

  public async dropItem(slotIndex?: number): Promise<boolean> {
    const slot = slotIndex !== undefined ? slotIndex : this.state.selectedSlot;
    const item = this.inventory.hotbar[slot];
    if (!item) return false;

    this.addLog('BOT', `Dropped item: 1x ${item.displayName}`);
    item.count -= 1;
    if (item.count <= 0) {
      this.inventory.hotbar[slot] = null;
    }
    this.notifyState();
    return true;
  }

  public async equipItem(sourceSlot: number, targetSlot: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'offhand'): Promise<boolean> {
    const currentArmor = this.inventory[targetSlot];
    const sourceItem = this.inventory.main[sourceSlot] || this.inventory.hotbar[sourceSlot];

    if (!sourceItem) return false;

    // Swap items
    this.inventory[targetSlot] = sourceItem;
    if (sourceSlot < 9) {
      this.inventory.hotbar[sourceSlot] = currentArmor;
    } else {
      this.inventory.main[sourceSlot - 9] = currentArmor;
    }

    this.addLog('INFO', `Equipped ${sourceItem.displayName} into ${targetSlot} slot.`);
    this.notifyState();
    return true;
  }

  public swapHand() {
    const mainSlot = this.state.selectedSlot;
    const mainItem = this.inventory.hotbar[mainSlot];
    const offhandItem = this.inventory.offhand;

    this.inventory.hotbar[mainSlot] = offhandItem;
    this.inventory.offhand = mainItem;

    this.addLog('BOT', `Swapped ${mainItem?.displayName || 'Empty'} with offhand ${offhandItem?.displayName || 'Empty'}`);
    this.notifyState();
  }

  public async chat(message: string): Promise<boolean> {
    const cleanMsg = message.trim();
    if (!cleanMsg) return false;

    if (cleanMsg.startsWith('/')) {
      await this.executeCommand(cleanMsg);
      return true;
    }

    const time = new Date().toTimeString().split(' ')[0];
    const chatEntry: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: time,
      sender: this.state.username,
      message: cleanMsg,
      type: 'player',
      isSelf: true,
    };

    this.chatMessages.push(chatEntry);
    this.chatListeners.forEach((cb) => cb(chatEntry));
    this.addLog('CHAT', `<${this.state.username}> ${cleanMsg}`);

    // Simulate echo or player response in demo mode
    setTimeout(() => {
      if (cleanMsg.toLowerCase().includes('hello') || cleanMsg.toLowerCase().includes('hi')) {
        const reply: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toTimeString().split(' ')[0],
          sender: 'Steve',
          message: 'Hey bot! Good to see you moving.',
          type: 'player',
        };
        this.chatMessages.push(reply);
        this.chatListeners.forEach((cb) => cb(reply));
        this.addLog('CHAT', `<Steve> ${reply.message}`);
      }
    }, 1200);

    return true;
  }

  public async executeCommand(command: string): Promise<{ success: boolean; output: string }> {
    const time = new Date().toTimeString().split(' ')[0];
    const cmdLine = command.startsWith('/') ? command.slice(1) : command;
    const parts = cmdLine.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    this.addLog('INFO', `[Command] Executing: /${cmdLine}`);

    let output = '';

    switch (cmd) {
      case 'help':
        output = 'Available commands: /help, /tp <x> <y> <z>, /time set <day|night>, /weather <clear|rain>, /gamemode <mode>, /say <msg>, /coords, /heal';
        break;
      case 'coords':
      case 'pos':
        output = `Bot position: X=${this.state.position.x}, Y=${this.state.position.y}, Z=${this.state.position.z} (${this.state.dimension})`;
        break;
      case 'heal':
        this.state.health = 20;
        this.state.food = 20;
        output = 'Bot health and hunger fully replenished.';
        this.notifyState();
        break;
      case 'time':
        output = `Set the time to ${args[1] || 'day'}.`;
        break;
      case 'weather':
        output = `Set the weather to ${args[0] || 'clear'}.`;
        break;
      case 'tp':
      case 'teleport':
        if (args.length >= 3) {
          const x = parseFloat(args[0]);
          const y = parseFloat(args[1]);
          const z = parseFloat(args[2]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            this.state.position.x = x;
            this.state.position.y = y;
            this.state.position.z = z;
            output = `Teleported ${this.state.username} to ${x}, ${y}, ${z}`;
            this.notifyState();
          } else {
            output = 'Invalid coordinates provided.';
          }
        } else {
          output = 'Usage: /tp <x> <y> <z>';
        }
        break;
      case 'say':
        const broadcast = args.join(' ');
        output = `[Server] ${broadcast}`;
        break;
      default:
        output = `Executed /${cmdLine} [Simulated command success]`;
        break;
    }

    const chatEntry: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: time,
      sender: '[Server]',
      message: output,
      type: 'command',
    };
    this.chatMessages.push(chatEntry);
    this.chatListeners.forEach((cb) => cb(chatEntry));
    this.addLog('SUCCESS', output);

    return { success: true, output };
  }

  public getState(): BotState {
    return { ...this.state };
  }

  public getInventory(): BotInventory {
    return { ...this.inventory };
  }

  public getPlayers(): PlayerInfo[] {
    return [...this.players];
  }

  public getServerInfo(): ServerInfo {
    return { ...this.serverInfo };
  }

  public getLogs(limit = 100): LogEntry[] {
    return this.logs.slice(0, limit);
  }

  public getChat(limit = 100): ChatMessage[] {
    return this.chatMessages.slice(0, limit);
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('INFO', 'Console logs cleared by operator.', 'system');
  }

  // --- TASK MANAGER SYSTEM ---

  public async startTask(taskParams: Omit<BotTask, 'id' | 'status' | 'progress' | 'startedAt'>): Promise<BotTask> {
    if (this.taskInterval) {
      clearInterval(this.taskInterval);
    }

    const newTask: BotTask = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: taskParams.title,
      type: taskParams.type,
      status: 'running',
      progress: 0,
      startedAt: new Date().toLocaleTimeString(),
      lastAction: 'Pathfinding initialized...',
      targetDetails: taskParams.targetDetails,
      targetCoords: taskParams.targetCoords,
      targetPlayer: taskParams.targetPlayer,
    };

    this.state.currentTask = newTask;
    this.addLog('INFO', `Started AI Task: "${newTask.title}" [${newTask.type}]`);
    this.notifyState();

    // Step-by-step progress simulation
    let progress = 0;
    this.taskInterval = setInterval(() => {
      if (!this.state.currentTask || this.state.currentTask.status !== 'running') return;

      progress += 10;
      this.state.currentTask.progress = Math.min(100, progress);

      // Move toward coordinates if provided
      if (this.state.currentTask.targetCoords) {
        const tx = this.state.currentTask.targetCoords.x;
        const tz = this.state.currentTask.targetCoords.z;
        this.state.position.x = parseFloat((this.state.position.x + (tx - this.state.position.x) * 0.15).toFixed(2));
        this.state.position.z = parseFloat((this.state.position.z + (tz - this.state.position.z) * 0.15).toFixed(2));
      }

      this.state.currentTask.lastAction = `Navigating waypoint step ${progress / 10}/10...`;

      if (progress >= 100) {
        clearInterval(this.taskInterval!);
        this.taskInterval = null;
        this.state.currentTask.status = 'completed';
        this.state.currentTask.lastAction = 'Task successfully accomplished!';
        this.addLog('SUCCESS', `Task "${this.state.currentTask.title}" completed successfully!`);
      }

      this.notifyState();
    }, 1500);

    return newTask;
  }

  public async pauseTask(taskId: string): Promise<boolean> {
    if (this.state.currentTask && this.state.currentTask.id === taskId) {
      this.state.currentTask.status = 'paused';
      this.state.currentTask.lastAction = 'Task execution paused by operator.';
      this.addLog('WARN', `Task paused: ${this.state.currentTask.title}`);
      this.notifyState();
      return true;
    }
    return false;
  }

  public async resumeTask(taskId: string): Promise<boolean> {
    if (this.state.currentTask && this.state.currentTask.id === taskId) {
      this.state.currentTask.status = 'running';
      this.state.currentTask.lastAction = 'Task execution resumed.';
      this.addLog('INFO', `Task resumed: ${this.state.currentTask.title}`);
      this.notifyState();
      return true;
    }
    return false;
  }

  public async stopTask(taskId: string): Promise<boolean> {
    if (this.state.currentTask && this.state.currentTask.id === taskId) {
      if (this.taskInterval) {
        clearInterval(this.taskInterval);
        this.taskInterval = null;
      }
      this.state.currentTask.status = 'failed';
      this.state.currentTask.lastAction = 'Task aborted by operator.';
      this.addLog('WARN', `Task stopped: ${this.state.currentTask.title}`);
      this.notifyState();
      return true;
    }
    return false;
  }

  public async restart(): Promise<boolean> {
    await this.disconnect();
    await new Promise((r) => setTimeout(r, 1000));
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
    return this.serverInfo.version;
  }

  public async sendChat(message: string): Promise<boolean> {
    return this.chat(message);
  }

  public getConsole(limit = 100): LogEntry[] {
    return this.getLogs(limit);
  }

  // --- SUBSCRIPTIONS ---

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
