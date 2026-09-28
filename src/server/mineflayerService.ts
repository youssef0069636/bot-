import mineflayerPkg from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import mineflayerPvpPkg from 'mineflayer-pvp';
import vec3Pkg from 'vec3';
import { GoogleGenAI } from '@google/genai';
import { BotInventory, BotState, BotTask, ChatMessage, InventorySlot, LogEntry, PlayerInfo } from '../types/minecraft.ts';

const mineflayer: any = (mineflayerPkg as any).default || mineflayerPkg;
const { pathfinder, Movements, goals }: any = (pathfinderPkg as any).default || pathfinderPkg;
const pvpPlugin: any = (mineflayerPvpPkg as any)?.plugin || (mineflayerPvpPkg as any)?.default?.plugin || mineflayerPvpPkg;
const vec3: any = (vec3Pkg as any).default || vec3Pkg;

export interface ConnectOptions {
  host: string;
  port: number;
  username: string;
  version?: string;
  authType?: 'offline' | 'microsoft';
  admins?: string[];
}

export class MineflayerService {
  private bot: any = null;
  private isConnecting: boolean = false;
  private lastError: string | null = null;
  private lastDisconnectReason: string | null = null;

  private logs: LogEntry[] = [];
  private chatMessages: ChatMessage[] = [];
  private currentTask: BotTask | null = null;

  // Youssef_Bot AI State Variables
  private attackTarget: any = null;
  private attackInterval: NodeJS.Timeout | null = null;
  private frozenPlayers: Map<string, NodeJS.Timeout> = new Map();
  private subBots: Map<string, any> = new Map();
  private customAliases: Map<string, string> = new Map();
  private quickAliases: Map<string, string> = new Map([
    ['!bc', '!botc'],
    ['!jb', '!jbot'],
    ['!sb', '!sbot'],
    ['!m', '!menu'],
    ['!si', '!server_info'],
    ['!cc', '!clear_chat'],
    ['!bh', '!build_house'],
    ['!sh', '!shield_me'],
    ['!cm', '!clear_monsters'],
    ['!st', '!stop'],
  ]);

  private options: ConnectOptions = {
    host: 'jeuxapk6.aternos.me',
    port: 63257,
    username: 'Youssef_Bot',
    version: '1.20.1',
    authType: 'offline',
    admins: ['youssef35153'],
  };

  private lastConnectTimestamp: number = 0;
  private aiClient: any = null;

  constructor() {
    this.addLog('INFO', 'Youssef_Bot AI Core Engine initialized.', 'system');
    try {
      this.aiClient = new GoogleGenAI({});
      this.addLog('INFO', 'Gemini AI Client initialized successfully for Minecraft reasoning.', 'system');
    } catch {
      console.warn('Gemini API initialization deferred until key provided.');
    }
  }

  public getStatus() {
    return {
      connected: this.bot !== null && (this.bot as any)._client?.state === 'play',
      isConnecting: this.isConnecting,
      lastError: this.lastError,
      lastDisconnectReason: this.lastDisconnectReason,
      options: this.options,
      admins: this.options.admins || ['youssef35153'],
      subBots: Array.from(this.subBots.keys()),
      frozenPlayers: Array.from(this.frozenPlayers.keys()),
      customAliases: Object.fromEntries(this.customAliases),
      quickAliases: Object.fromEntries(this.quickAliases),
    };
  }

  public addLog(level: LogEntry['level'], message: string, source: LogEntry['source'] = 'bot') {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toTimeString().split(' ')[0],
      level,
      message,
      source,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 500) this.logs.pop();
    console.log(`[Mineflayer] [${entry.level}] ${entry.message}`);
  }

  public isAdmin(username: string): boolean {
    if (!username) return false;
    const admins = this.options.admins || ['youssef35153'];
    return admins.some((a) => a.toLowerCase() === username.toLowerCase());
  }

  public isValidTarget(targetName: string): boolean {
    if (!targetName) return false;
    if (this.isAdmin(targetName)) return false;
    if (this.bot && targetName.toLowerCase() === this.bot.username?.toLowerCase()) return false;
    return true;
  }

  public stopMovement() {
    this.attackTarget = null;
    if (this.attackInterval) {
      clearInterval(this.attackInterval);
      this.attackInterval = null;
    }
    if (this.bot) {
      try {
        if (this.bot.pvp) this.bot.pvp.stop();
        if (this.bot.pathfinder) {
          this.bot.pathfinder.stop();
          this.bot.pathfinder.setGoal(null);
        }
      } catch {
        // ignore
      }
    }
  }

  public async connect(opts?: Partial<ConnectOptions>): Promise<{ success: boolean; message: string }> {
    if (this.bot) {
      try {
        this.bot.quit();
      } catch {
        // ignore
      }
      this.bot = null;
    }

    if (opts) {
      this.options = { ...this.options, ...opts };
    }

    // Protect against Paper connection-throttle (5.5s cooldown)
    const elapsed = Date.now() - this.lastConnectTimestamp;
    if (elapsed < 5500) {
      const waitTime = 5500 - elapsed;
      this.addLog('INFO', `Waiting ${Math.ceil(waitTime / 1000)}s for Paper server throttle cooldown...`, 'system');
      await new Promise((r) => setTimeout(r, waitTime));
    }
    this.lastConnectTimestamp = Date.now();

    this.isConnecting = true;
    this.lastError = null;
    this.lastDisconnectReason = null;

    let host = this.options.host.trim();
    let port = Number(this.options.port) || 63257;
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0].trim();
      port = parseInt(parts[1], 10) || port;
    }
    const username = this.options.username.trim() || 'Youssef_Bot';
    const auth = this.options.authType === 'microsoft' ? 'microsoft' : 'offline';
    const version = this.options.version && this.options.version !== 'auto' ? this.options.version : '1.21.1';

    this.addLog('INFO', `Connecting bot "${username}" to Minecraft server at ${host}:${port} (${version}, ${auth} mode)...`, 'bot');

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (success: boolean, message: string) => {
        if (!resolved) {
          resolved = true;
          this.isConnecting = false;
          resolve({ success, message });
        }
      };

      const timeout = setTimeout(() => {
        if (this.isConnecting) {
          const err = `Connection timeout: Could not reach Minecraft server at ${host}:${port}. Please verify the server is online.`;
          this.lastError = err;
          this.addLog('ERROR', err, 'system');
          finish(false, err);
        }
      }, 35000);

      try {
        const botConfig: any = {
          host,
          port,
          username,
          auth,
          version,
          checkTimeoutInterval: 60000,
          hideErrors: false,
        };

        const bot = mineflayer.createBot(botConfig);
        this.bot = bot;

        // Auto-respond to 1.20.2+ / 1.21+ configuration phase resource packs
        if (bot._client) {
          bot._client.on('add_resource_pack', (data: any) => {
            try {
              this.addLog('INFO', 'Server requested resource pack. Auto-acknowledging...', 'server');
              bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 3 }); // accepted
              setTimeout(() => {
                try {
                  bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 0 }); // loaded
                } catch {
                  // ignore
                }
              }, 100);
            } catch {
              // ignore
            }
          });
        }

        bot.on('resourcePack', () => {
          try {
            bot.acceptResourcePack();
          } catch {
            // ignore
          }
        });

        // Load pathfinder & pvp plugins
        try {
          bot.loadPlugin(pathfinder);
        } catch {
          // ignore
        }
        try {
          if (pvpPlugin) bot.loadPlugin(pvpPlugin);
        } catch {
          // ignore
        }

        bot.on('login', () => {
          this.addLog('SUCCESS', `Bot logged in! Protocol handshake complete with ${host}:${port}`, 'bot');
        });

        bot.once('spawn', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.lastError = null;

          try {
            const defaultMove = new (Movements as any)(bot);
            bot.pathfinder.setMovements(defaultMove);
          } catch {
            // ignore
          }

          try {
            bot.chat('/gamemode creative');
          } catch {
            // ignore
          }

          const pos = bot.entity ? bot.entity.position : { x: 0, y: 0, z: 0 };
          this.addLog('SUCCESS', `Bot "${username}" successfully joined world at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})!`, 'bot');
          finish(true, 'Bot successfully connected and spawned in world!');
        });

        bot.on('kicked', (reason: any) => {
          clearTimeout(timeout);
          let reasonStr = '';
          try {
            if (typeof reason === 'string') {
              reasonStr = reason;
            } else if (reason?.value?.with?.value?.[0]?.value) {
              reasonStr = reason.value.with.value[0].value;
            } else {
              reasonStr = JSON.stringify(reason);
            }
          } catch {
            reasonStr = String(reason);
          }

          this.lastDisconnectReason = reasonStr;
          this.addLog('WARN', `Bot was kicked by server: ${reasonStr}`, 'server');
          this.isConnecting = false;

          if (reasonStr.includes('throttled')) {
            this.addLog('INFO', 'Paper server connection throttle cooldown active. Auto-reconnecting in 6 seconds...', 'system');
            setTimeout(() => {
              if (!this.bot && !this.isConnecting) {
                this.connect().catch(() => {});
              }
            }, 6000);
          }

          finish(false, `Kicked by server: ${reasonStr}`);
        });

        bot.on('error', (err: any) => {
          if (err?.message?.includes('PartialReadError')) {
            return;
          }

          clearTimeout(timeout);
          const msg = err?.message || String(err);
          this.lastError = msg;

          let friendlyHint = msg;
          if (msg.includes('ECONNREFUSED')) {
            friendlyHint = `Connection refused (${host}:${port}). The Minecraft server is OFFLINE. Start it on Aternos and check dynamic port!`;
          } else if (msg.includes('ECONNRESET')) {
            friendlyHint = `Connection reset by server (${host}:${port}). Wait 5s for Paper cooldown.`;
          } else if (msg.includes('ENOTFOUND')) {
            friendlyHint = `Server address not found: "${host}". Check hostname.`;
          }

          this.addLog('ERROR', friendlyHint, 'system');
          this.isConnecting = false;
          finish(false, friendlyHint);
        });

        bot.on('end', (reason: any) => {
          this.addLog('WARN', `Bot connection ended: ${reason || 'Connection closed'}. Reconnecting in 10s...`, 'bot');
          this.bot = null;
          this.isConnecting = false;
          setTimeout(() => {
            if (!this.bot && !this.isConnecting) {
              this.connect().catch(() => {});
            }
          }, 10000);
        });

        bot.on('chat', (sender: string, message: string) => {
          const chatEntry: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toTimeString().split(' ')[0],
            sender,
            message,
            type: sender === bot.username ? 'bot' : 'player',
            isSelf: sender === bot.username,
          };
          this.chatMessages.push(chatEntry);
          if (this.chatMessages.length > 200) this.chatMessages.shift();
          this.addLog('CHAT', `<${sender}> ${message}`);

          if (sender !== bot.username) {
            this.handleCommand(sender, message);
          }
        });

        bot.on('message', (jsonMsg: any) => {
          const text = jsonMsg.toString();
          if (text && !text.startsWith('<')) {
            const chatEntry: ChatMessage = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toTimeString().split(' ')[0],
              sender: '[Server]',
              message: text,
              type: 'system',
            };
            this.chatMessages.push(chatEntry);
            if (this.chatMessages.length > 200) this.chatMessages.shift();
          }
        });

        bot.on('death', () => {
          this.addLog('WARN', `Bot has died! Respawning automatically...`, 'bot');
        });
      } catch (err: unknown) {
        clearTimeout(timeout);
        const msg = err instanceof Error ? err.message : String(err);
        this.lastError = msg;
        this.addLog('ERROR', `Failed to create bot instance: ${msg}`, 'system');
        finish(false, msg);
      }
    });
  }

  // Youssef_Bot Command & AI Processing Engine
  public async handleCommand(username: string, message: string) {
    const bot = this.bot;
    if (!bot) return;

    message = message.trim();
    if (!message) return;

    const firstWord = message.split(/\s+/)[0].toLowerCase();
    let processedMessage = message;

    if (this.quickAliases.has(firstWord)) {
      processedMessage = message.replace(firstWord, this.quickAliases.get(firstWord)!);
    } else if (this.customAliases.has(firstWord)) {
      processedMessage = message.replace(firstWord, this.customAliases.get(firstWord)!);
    }

    const args = processedMessage.split(/\s+/);
    const commandName = args.shift()?.toLowerCase() || '';

    // Handle Registered Commands
    switch (commandName) {
      case '!bot': {
        if (!bot.entity) return bot.chat('البوت مازال ما تحمّلش');
        const pos = bot.entity.position;
        bot.chat(`🤖 أنا Youssef_Bot AI | X:${pos.x.toFixed(0)} Y:${pos.y.toFixed(0)} Z:${pos.z.toFixed(0)}`);
        break;
      }
      case '!coords': {
        if (!bot.entity) return bot.chat('البوت مازال ما تحمّلش');
        const pos = bot.entity.position;
        bot.chat(`📍 إحداثياتي: X:${pos.x.toFixed(0)} Y:${pos.y.toFixed(0)} Z:${pos.z.toFixed(0)}`);
        break;
      }
      case '!ping': {
        bot.chat('🏓 Pong! الاستجابة ممتازة.');
        break;
      }
      case '!players': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        bot.chat(`👥 المتصلون: ${Object.keys(bot.players || {}).join(', ')}`);
        break;
      }
      case '!server_info': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        bot.chat(`🌐 السيرفر: ${this.options.host} | الإصدار: ${this.options.version || '1.20.1'}`);
        break;
      }
      case '!clear_chat': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        for (let i = 0; i < 15; i++) bot.chat('');
        bot.chat('🧹 تم مسح الشاشة.');
        break;
      }
      case '!stop': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        this.stopMovement();
        bot.chat('🛑 توقفت جميع العمليات.');
        break;
      }

      // Sub-bot Management
      case '!botc': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const subBotName = args[0] || 'Helper_Bot';
        if (this.subBots.has(subBotName)) return bot.chat(`⚠️ البوت "${subBotName}" موجود مسبقاً.`);
        bot.chat(`🤖 جاري إنشاء البوت "${subBotName}"...`);
        try {
          const helper = mineflayer.createBot({
            host: this.options.host,
            port: this.options.port,
            username: subBotName,
            version: this.options.version || '1.20.1',
            auth: 'offline',
          });
          helper.once('spawn', () => {
            helper.chat('/gamemode creative');
            helper.chat('مرحباً! أنا بوت مساعد.');
          });
          this.subBots.set(subBotName, helper);
          bot.chat(`✅ تم نشر البوت "${subBotName}" بنجاح!`);
          this.addLog('SUCCESS', `Sub-bot "${subBotName}" spawned.`, 'bot');
        } catch {
          bot.chat('❌ فشل إنشاء البوت.');
        }
        break;
      }
      case '!jbot': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        if (this.subBots.size === 0) return bot.chat('ℹ️ لا توجد بوتات مساعدة نشطة.');
        bot.chat(`🤖 البوتات النشطة: [ ${Array.from(this.subBots.keys()).join(', ')} ]`);
        break;
      }
      case '!sbot': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const subBotName = args[0];
        if (!subBotName) return bot.chat('❌ استعمل: !sb <BotName>');
        const helper = this.subBots.get(subBotName);
        if (!helper) return bot.chat('❌ البوت غير موجود.');
        helper.quit();
        this.subBots.delete(subBotName);
        bot.chat(`🛑 تم إيقاف البوت "${subBotName}".`);
        break;
      }

      // Aliases
      case '!+': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const alias = args[0];
        const fullCmd = args.slice(1).join(' ');
        if (!alias || !fullCmd) return bot.chat('❌ استعمل: !+ <alias> <cmd>');
        const shortCmd = alias.startsWith('!') ? alias.toLowerCase() : `!${alias.toLowerCase()}`;
        this.customAliases.set(shortCmd, fullCmd);
        bot.chat(`✅ تم حفظ الاختصار ${shortCmd} بنجاح!`);
        break;
      }
      case '!-': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const alias = args[0];
        if (!alias) return bot.chat('❌ استعمل: !- <alias>');
        const shortCmd = alias.startsWith('!') ? alias.toLowerCase() : `!${alias.toLowerCase()}`;
        if (this.customAliases.delete(shortCmd)) {
          bot.chat(`🗑️ تم حذف الاختصار ${shortCmd}.`);
        } else {
          bot.chat(`⚠️ الاختصار غير موجود.`);
        }
        break;
      }
      case '!list_aliases': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const list: string[] = [];
        this.quickAliases.forEach((cmd, al) => list.push(`${al}➔${cmd}`));
        this.customAliases.forEach((cmd, al) => list.push(`${al}➔${cmd}`));
        bot.chat(`⚡ الاختصارات المتاحة: ${list.join(' | ')}`);
        break;
      }

      // Menu
      case '!menu': {
        bot.chat('=== 📜 الاختصارات السريعة (Youssef_Bot) == /m للمنيو ===');
        bot.chat('🤖 بوتات: !bc <name> | !jb | !sb <name>');
        bot.chat('🏛️ بناء: !build | !bh | !sh');
        bot.chat('⚔️ قتال: !g <player> | !st | !cm');
        bot.chat('❄️ عقوبات: !f <player> | !sf <player> | !kick | !ban');
        break;
      }

      // Building Structures
      case '!build': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const type = args[0] || 'mansion';
        const size = parseInt(args[1] || '15', 10) || 15;
        const height = parseInt(args[2] || '8', 10) || 8;
        const material = args[3] || 'smooth_quartz';

        const targetPlayer = bot.players[username]?.entity;
        if (!targetPlayer) return bot.chat('❌ يجب أن تكون قريباً مني لأعرف مكان بناء الهيكل!');

        const pos = targetPlayer.position.floored();
        bot.chat(`🧠 جاري بناء (${type}) عند إحداثياتك...`);

        try {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < size; x++) {
              for (let z = 0; z < size; z++) {
                const isBorder = x === 0 || x === size - 1 || z === 0 || z === size - 1;
                let blockToPlace = 'air';
                if (y === 0) blockToPlace = material;
                else if (y === height - 1) blockToPlace = isBorder ? 'stone_bricks' : 'glass';
                else if (isBorder) blockToPlace = material;

                if (blockToPlace !== 'air') {
                  bot.chat(`/setblock ${pos.x + x} ${pos.y + y} ${pos.z + z} ${blockToPlace}`);
                  await new Promise((r) => setTimeout(r, 8));
                }
              }
            }
          }
          bot.chat('✨ تم الانتهاء من بناء الهيكل في موقعك بنجاح!');
        } catch {
          bot.chat('❌ حدث خطأ أثناء البناء.');
        }
        break;
      }
      case '!build_house': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetPlayer = bot.players[username]?.entity;
        if (!targetPlayer) return bot.chat('❌ يجب أن تكون قريباً مني!');
        const pos = targetPlayer.position.floored();
        bot.chat('🏠 جاري بناء قصر أساسي حول موقعك...');
        for (let x = -5; x <= 5; x++) {
          for (let z = -5; z <= 5; z++) {
            for (let y = 0; y <= 4; y++) {
              let block = 'air';
              if (y === 0) block = 'oak_planks';
              else if (y === 4) block = 'smooth_stone';
              else if (Math.abs(x) === 5 || Math.abs(z) === 5) block = 'cobblestone';
              if (block !== 'air') bot.chat(`/setblock ${pos.x + x} ${pos.y + y - 1} ${pos.z + z} ${block}`);
            }
          }
        }
        bot.chat('✅ تم بناء القصر حول مكانك بدقة!');
        break;
      }
      case '!shield_me': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const player = bot.players[username]?.entity;
        if (!player) return bot.chat('❌ اللاعب غير موجود قربي.');
        const pos = player.position.floored();
        bot.chat('🛡️ بناء درع حماية زجاجي حولك...');
        for (let x = -2; x <= 2; x++) {
          for (let z = -2; z <= 2; z++) {
            for (let y = 0; y <= 3; y++) {
              if (Math.abs(x) === 2 || Math.abs(z) === 2 || y === 0 || y === 3) {
                bot.chat(`/setblock ${pos.x + x} ${pos.y + y} ${pos.z + z} glass`);
              }
            }
          }
        }
        bot.chat('✅ تم تفعيل الدرع حولك!');
        break;
      }

      // PvP and Moderation
      case '!g': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetName = args[0];
        if (!targetName) return bot.chat('❌ استعمل: !g <player>');
        if (!this.isValidTarget(targetName)) return bot.chat('❌ لا يمكن مهاجمة مشرف.');
        const target = bot.players[targetName]?.entity;
        if (!target) return bot.chat('❌ اللاعب غير موجود بالقرب مني.');
        bot.chat(`⚔️ هجومي مفعل على ${targetName}!`);
        this.attackTarget = target;
        if (this.attackInterval) clearInterval(this.attackInterval);
        this.attackInterval = setInterval(() => {
          if (!this.attackTarget || !this.attackTarget.isValid) {
            if (this.attackInterval) clearInterval(this.attackInterval);
            this.attackTarget = null;
            return;
          }
          if (bot.pvp) {
            bot.pvp.attack(this.attackTarget);
          } else {
            bot.attack(this.attackTarget);
          }
        }, 500);
        break;
      }
      case '!clear_monsters': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        bot.chat('⚔️ إبادة الوحوش المحيطة...');
        bot.chat('/kill @e[type=!player,type=!armor_stand,distance=..40]');
        bot.chat('⚡ تمت التصفية!');
        break;
      }
      case '!f': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetName = args[0];
        if (!targetName) return bot.chat('❌ استعمل: !f <player>');
        const key = targetName.toLowerCase();
        if (this.frozenPlayers.has(key)) return bot.chat('❄️ مجمد بالفعل.');
        const player = bot.players[targetName]?.entity;
        if (!player) return bot.chat('❌ اللاعب غير موجود.');
        const interval = setInterval(() => {
          const p = bot.players[targetName]?.entity;
          if (p) bot.chat(`/tp ${targetName} ${p.position.x} ${p.position.y} ${p.position.z}`);
          else {
            const intv = this.frozenPlayers.get(key);
            if (intv) clearInterval(intv);
            this.frozenPlayers.delete(key);
          }
        }, 1000);
        this.frozenPlayers.set(key, interval);
        bot.chat(`❄️ تم تجميد ${targetName}.`);
        break;
      }
      case '!sf': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetName = args[0];
        if (!targetName) return bot.chat('❌ استعمل: !sf <player>');
        const key = targetName.toLowerCase();
        if (this.frozenPlayers.has(key)) {
          clearInterval(this.frozenPlayers.get(key)!);
          this.frozenPlayers.delete(key);
          bot.chat(`✅ فك التجميد عن ${targetName}.`);
        } else {
          bot.chat('ℹ️ ليس مجمداً.');
        }
        break;
      }
      case '!kick': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetName = args[0];
        if (!targetName) return bot.chat('❌ استعمل: !kick <player>');
        const reason = args.slice(1).join(' ') || 'مطرود';
        bot.chat(`/kick ${targetName} ${reason}`);
        break;
      }
      case '!ban': {
        if (!this.isAdmin(username)) return bot.chat('❌ هذا الأمر خاص بالـ Admin فقط!');
        const targetName = args[0];
        if (!targetName) return bot.chat('❌ استعمل: !ban <player>');
        const reason = args.slice(1).join(' ') || 'محظور';
        bot.chat(`/ban ${targetName} ${reason}`);
        break;
      }

      // Natural AI Query fallback for any other !query
      default: {
        if (message.startsWith('!')) {
          const userQuery = message.substring(1).trim();
          if (!userQuery) return;

          bot.chat('🤔 جاري التفكير...');
          try {
            if (!this.aiClient) {
              this.aiClient = new GoogleGenAI({});
            }

            let response: any = null;
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
              try {
                response = await this.aiClient.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `أنت Youssef_Bot AI، بوت ماينكرافت ذكي وخارق للإدارة. أجب باختصار شديد (أقل من 90 حرف) وباللغة المغربية أو العربية على هذا السؤال: ${userQuery}`,
                });
                break;
              } catch (apiErr) {
                retries--;
                if (retries === 0) throw apiErr;
                await new Promise((res) => setTimeout(res, delay));
                delay *= 2;
              }
            }

            let reply = '';
            if (response && response.text) {
              reply = typeof response.text === 'function' ? response.text() : response.text;
            } else if (response && response.candidates && response.candidates[0]) {
              reply = response.candidates[0].content.parts[0].text;
            }

            if (reply) {
              bot.chat(reply.trim().substring(0, 95));
            } else {
              bot.chat('❌ لم أتمكن من صياغة إجابة.');
            }
          } catch (err: any) {
            console.error('AI Error Details:', err?.message || err);
            bot.chat('❌ السيرفر مضغوط حالياً، عاود صيفط السوال من بعد شوي.');
          }
        }
        break;
      }
    }
  }

  public async disconnect(): Promise<boolean> {
    if (this.bot) {
      try {
        this.bot.quit();
      } catch {
        // ignore
      }
      this.bot = null;
    }
    this.isConnecting = false;
    this.addLog('INFO', 'Bot disconnected from Minecraft server.', 'bot');
    return true;
  }

  public getState(): BotState {
    const isOnline = this.bot !== null && (this.bot as any)._client?.state === 'play';
    const pos = this.bot?.entity?.position || { x: 0, y: 0, z: 0 };
    const vel = this.bot?.entity?.velocity || { x: 0, y: 0, z: 0 };

    return {
      connected: isOnline,
      mode: 'remote',
      username: this.bot?.username || this.options.username,
      status: this.isConnecting ? 'connecting' : isOnline ? 'online' : this.lastError ? 'error' : 'offline',
      health: this.bot?.health ?? 20,
      maxHealth: 20,
      food: this.bot?.food ?? 20,
      saturation: this.bot?.foodSaturation ?? 5,
      armor: 0,
      oxygen: this.bot?.oxygenLevel ?? 20,
      position: {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        yaw: this.bot?.entity ? parseFloat(((this.bot.entity.yaw * 180) / Math.PI).toFixed(1)) : 0,
        pitch: this.bot?.entity ? parseFloat(((this.bot.entity.pitch * 180) / Math.PI).toFixed(1)) : 0,
      },
      velocity: {
        x: parseFloat(vel.x.toFixed(2)),
        y: parseFloat(vel.y.toFixed(2)),
        z: parseFloat(vel.z.toFixed(2)),
      },
      dimension: (this.bot?.game?.dimension as any) || 'overworld',
      biome: 'Minecraft Biome',
      ping: (this.bot?.player as any)?.ping || 25,
      currentTask: this.currentTask,
      selectedSlot: (this.bot as any)?.quickBarSlot || 0,
      sneaking: this.bot ? (this.bot as any).getControlState?.('sneak') || false : false,
      sprinting: this.bot ? (this.bot as any).getControlState?.('sprint') || false : false,
      isGrounded: this.bot?.entity?.onGround || true,
      lastUpdated: new Date().toISOString(),
    };
  }

  public getInventory(): BotInventory {
    const bot = this.bot;
    if (!bot || !bot.inventory) {
      return {
        helmet: null,
        chestplate: null,
        leggings: null,
        boots: null,
        offhand: null,
        hotbar: Array(9).fill(null),
        main: Array(27).fill(null),
      };
    }

    const mapItem = (item: any, slotIdx: number): InventorySlot => ({
      id: item.type,
      name: item.name,
      displayName: item.displayName || item.name,
      count: item.count,
      maxStackSize: item.stackSize || 64,
      durability:
        item.durabilityUsed !== undefined && item.maxDurability
          ? { current: item.maxDurability - item.durabilityUsed, max: item.maxDurability }
          : undefined,
      slotIndex: slotIdx,
      iconType: item.name,
    });

    const hotbar: (InventorySlot | null)[] = Array(9).fill(null);
    for (let i = 0; i < 9; i++) {
      const item = bot.inventory.slots[36 + i];
      if (item) hotbar[i] = mapItem(item, i);
    }

    const main: (InventorySlot | null)[] = Array(27).fill(null);
    for (let i = 0; i < 27; i++) {
      const item = bot.inventory.slots[9 + i];
      if (item) main[i] = mapItem(item, 9 + i);
    }

    return {
      helmet: bot.inventory.slots[5] ? mapItem(bot.inventory.slots[5], 5) : null,
      chestplate: bot.inventory.slots[6] ? mapItem(bot.inventory.slots[6], 6) : null,
      leggings: bot.inventory.slots[7] ? mapItem(bot.inventory.slots[7], 7) : null,
      boots: bot.inventory.slots[8] ? mapItem(bot.inventory.slots[8], 8) : null,
      offhand: bot.inventory.slots[45] ? mapItem(bot.inventory.slots[45], 45) : null,
      hotbar,
      main,
    };
  }

  public getPlayers(): PlayerInfo[] {
    if (!this.bot || !this.bot.players) return [];

    const myPos = this.bot.entity?.position || { x: 0, y: 0, z: 0 };

    return Object.values(this.bot.players).map((p: any) => {
      const entity = p.entity;
      const pos = entity ? entity.position : { x: 0, y: 0, z: 0 };
      const dist = entity ? parseFloat(Math.hypot(pos.x - myPos.x, pos.z - myPos.z).toFixed(1)) : 999;

      return {
        uuid: p.uuid || '',
        username: p.username,
        ping: p.ping || 20,
        health: 20,
        position: { x: parseFloat(pos.x.toFixed(1)), y: parseFloat(pos.y.toFixed(1)), z: parseFloat(pos.z.toFixed(1)) },
        distance: dist,
        isOnline: true,
        gamemode: p.gamemode === 1 ? 'creative' : 'survival',
      };
    });
  }

  public getLogs(limit = 100): LogEntry[] {
    return this.logs.slice(0, limit);
  }

  public getChat(limit = 100): ChatMessage[] {
    return this.chatMessages.slice(0, limit);
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('INFO', 'Logs cleared by operator', 'system');
  }

  public move(direction: 'forward' | 'back' | 'left' | 'right', active: boolean) {
    if (this.bot) {
      this.bot.setControlState(direction, active);
    }
  }

  public action(action: 'jump' | 'sneak' | 'sprint' | 'attack' | 'interact', active = true) {
    if (!this.bot) return;

    if (action === 'jump') {
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot?.setControlState('jump', false), 350);
    } else if (action === 'sneak') {
      this.bot.setControlState('sneak', active);
    } else if (action === 'sprint') {
      this.bot.setControlState('sprint', active);
    } else if (action === 'attack') {
      const entity = this.bot.nearestEntity((e: any) => e.type === 'player' || e.type === 'mob');
      if (entity) {
        this.bot.attack(entity);
      } else {
        this.bot.swingArm('right');
      }
    } else if (action === 'interact') {
      const block = this.bot.blockAtCursor(4);
      if (block) {
        this.bot.activateBlock(block).catch(() => {});
      }
    }
  }

  public chat(message: string) {
    if (this.bot) {
      this.bot.chat(message);
    }
  }

  public selectSlot(slot: number) {
    if (this.bot && slot >= 0 && slot <= 8) {
      this.bot.setQuickBarSlot(slot);
    }
  }

  public async dropItem(slot?: number) {
    if (!this.bot) return;
    try {
      const item = slot !== undefined ? this.bot.inventory.slots[36 + slot] : this.bot.heldItem;
      if (item) {
        await this.bot.tossStack(item);
      }
    } catch {
      // ignore
    }
  }

  public async startTask(task: Omit<BotTask, 'id' | 'status' | 'progress' | 'startedAt'>): Promise<BotTask> {
    const newTask: BotTask = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: task.title,
      type: task.type,
      status: 'running',
      progress: 0,
      startedAt: new Date().toLocaleTimeString(),
      lastAction: 'Pathfinder initiated...',
      targetDetails: task.targetDetails,
      targetCoords: task.targetCoords,
      targetPlayer: task.targetPlayer,
    };

    this.currentTask = newTask;

    if (this.bot && (this.bot as any).pathfinder) {
      const pfinder = (this.bot as any).pathfinder;
      const defaultMove = new (Movements as any)(this.bot);
      pfinder.setMovements(defaultMove);

      if (task.targetCoords) {
        pfinder.setGoal(new goals.GoalBlock(task.targetCoords.x, task.targetCoords.y, task.targetCoords.z));
      } else if (task.targetPlayer) {
        const targetPl = this.bot.players[task.targetPlayer]?.entity;
        if (targetPl) {
          pfinder.setGoal(new goals.GoalFollow(targetPl, 3), true);
        }
      }
    }

    return newTask;
  }

  public stopTask() {
    if (this.currentTask) {
      this.currentTask.status = 'failed';
      this.currentTask.lastAction = 'Aborted by operator';
      if (this.bot && (this.bot as any).pathfinder) {
        (this.bot as any).pathfinder.stop();
      }
      this.currentTask = null;
    }
  }
}

export const mineflayerService = new MineflayerService();
