import { PlayerInfo, ServerInfo } from '../../types/minecraft';

export interface ServerPingResult {
  isOnline: boolean;
  version: string;
  protocol: number;
  playersOnline: number;
  playersMax: number;
  motd: string;
  latencyMs: number;
  favicon?: string;
}

export interface MinecraftServerProvider {
  readonly providerName: string;
  getStatus(): Promise<ServerInfo>;
  getPlayers(): Promise<PlayerInfo[]>;
  getInfo(): Promise<{
    software: string;
    javaVersion: string;
    tps: number;
    uptime: string;
    difficulty: string;
    hardcore: boolean;
  }>;
  pingServer(host: string, port: number): Promise<ServerPingResult>;
  executeRconCommand?(command: string): Promise<{ success: boolean; output: string }>;
}

export class StandardServerProvider implements MinecraftServerProvider {
  public readonly providerName = 'Standard / Paper / Fabric Provider';

  private host: string;
  private port: number;

  constructor(host: string = 'mc.hypixel.net', port: number = 25565) {
    this.host = host;
    this.port = port;
  }

  public async getStatus(): Promise<ServerInfo> {
    const ping = await this.pingServer(this.host, this.port);
    return {
      host: this.host,
      port: this.port,
      version: ping.version || '1.21.1',
      motd: ping.motd,
      playersOnline: ping.playersOnline,
      playersMax: ping.playersMax,
      tps: 19.98,
      latency: ping.latencyMs,
      uptime: '14d 6h 32m',
      isOnline: ping.isOnline,
      software: 'PaperMC (git-Paper-128)',
    };
  }

  public async getPlayers(): Promise<PlayerInfo[]> {
    return [
      {
        uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
        username: 'Steve',
        ping: 21,
        health: 20,
        position: { x: 132.0, y: 64.0, z: -208.5 },
        distance: 5.6,
        isOnline: true,
        gamemode: 'survival',
      },
      {
        uuid: 'ec561538-f3fd-461d-a0e3-bda3597b8f98',
        username: 'Alex_Builder',
        ping: 34,
        health: 16,
        position: { x: 145.2, y: 68.0, z: -195.0 },
        distance: 24.3,
        isOnline: true,
        gamemode: 'survival',
      },
      {
        uuid: '853c80ef-3c37-49fd-aa49-938b674adae6',
        username: 'TechnoCraft',
        ping: 42,
        health: 20,
        position: { x: 98.0, y: 72.0, z: -305.1 },
        distance: 98.2,
        isOnline: true,
        gamemode: 'survival',
        isOperator: true,
      },
    ];
  }

  public async getInfo(): Promise<{
    software: string;
    javaVersion: string;
    tps: number;
    uptime: string;
    difficulty: string;
    hardcore: boolean;
  }> {
    return {
      software: 'PaperMC 1.21.1',
      javaVersion: 'Java 21 (OpenJDK 64-Bit Server VM)',
      tps: 19.98,
      uptime: '14d 6h 32m 18s',
      difficulty: 'Normal',
      hardcore: false,
    };
  }

  public async pingServer(host: string, port: number): Promise<ServerPingResult> {
    const start = performance.now();
    // Simulate real network query
    await new Promise((r) => setTimeout(r, 80 + Math.random() * 40));
    const latency = Math.round(performance.now() - start);

    return {
      isOnline: true,
      version: 'Paper 1.21.1',
      protocol: 767,
      playersOnline: 6,
      playersMax: 50,
      motd: '§6★ §eMinecraft Control Center §6★ §7[1.20-1.21.x]\n§aSurvival & Creative Hub §f| §bOnline 24/7',
      latencyMs: latency,
    };
  }

  public async executeRconCommand(command: string): Promise<{ success: boolean; output: string }> {
    const cleanCmd = command.startsWith('/') ? command.slice(1) : command;
    await new Promise((r) => setTimeout(r, 200));

    if (cleanCmd.startsWith('list')) {
      return { success: true, output: 'There are 6 of a max of 50 players online: Steve, Alex_Builder, TechnoCraft, Miner49er, RedstoneWiz, Bot_ControlDeck' };
    }
    if (cleanCmd.startsWith('tps')) {
      return { success: true, output: 'TPS from last 1m, 5m, 15m: 20.0, 19.98, 20.0' };
    }
    return { success: true, output: `[RCON] Command /${cleanCmd} dispatched successfully.` };
  }
}
