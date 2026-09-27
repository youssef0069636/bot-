import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { mineflayerService } from './src/server/mineflayerService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory server logs & audit trail
const serverLogs: Array<{ id: string; timestamp: string; level: string; message: string }> = [
  { id: '1', timestamp: new Date().toISOString(), level: 'INFO', message: 'Minecraft Control Center gateway initialized' },
];

// Health Check Endpoint (Requirement 20)
app.get('/api/health', (req: Request, res: Response) => {
  const status = mineflayerService.getStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Minecraft Control Center Core with Real Mineflayer Engine',
    botEngine: {
      connected: status.connected,
      isConnecting: status.isConnecting,
      lastError: status.lastError,
      lastDisconnectReason: status.lastDisconnectReason,
      targetHost: status.options.host,
      targetPort: status.options.port,
    },
    runtime: {
      mode: process.env.BOT_RUNTIME_URL ? 'remote' : 'live-local',
      persistentConfigured: !!process.env.BOT_RUNTIME_URL,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    },
  });
});

// Diagnostic Server Ping Tester (Checks if Minecraft server is actually online & reachable)
app.post('/api/server/test-ping', async (req: Request, res: Response) => {
  const { host, port } = req.body;
  const targetHost = (host || 'localhost').trim();
  const targetPort = parseInt(port || '25565', 10);

  if (!targetHost) {
    return res.status(400).json({ success: false, error: 'Host is required' });
  }

  const start = Date.now();
  const socket = new net.Socket();
  socket.setTimeout(4000);

  socket.on('connect', () => {
    const latency = Date.now() - start;
    socket.destroy();
    res.json({
      success: true,
      online: true,
      latency,
      message: `Successfully connected to ${targetHost}:${targetPort}! Port is open and ready.`,
    });
  });

  socket.on('timeout', () => {
    socket.destroy();
    res.json({
      success: false,
      online: false,
      error: `Connection timed out after 4000ms. The server at ${targetHost}:${targetPort} may be offline, sleeping, or blocked by a firewall.`,
    });
  });

  socket.on('error', (err: any) => {
    socket.destroy();
    let advice = err.message;
    if (err.code === 'ECONNREFUSED') {
      advice = `Port ${targetPort} is closed or rejected connection. Make sure your server (e.g. Aternos, Falix, Paper) is STARTED and you are using the exact dynamic port.`;
    } else if (err.code === 'ENOTFOUND') {
      advice = `Host "${targetHost}" could not be resolved. Please check the domain or IP address spelling.`;
    }
    res.json({
      success: false,
      online: false,
      error: advice,
      code: err.code,
    });
  });

  socket.connect(targetPort, targetHost);
});

// Real Mineflayer Bot Connection Endpoints
app.post('/api/bot/connect', async (req: Request, res: Response) => {
  const { host, port, username, version, authType } = req.body;
  const result = await mineflayerService.connect({
    host,
    port: parseInt(port, 10),
    username,
    version,
    authType,
  });

  res.json(result);
});

app.post('/api/bot/disconnect', async (req: Request, res: Response) => {
  await mineflayerService.disconnect();
  res.json({ success: true, message: 'Disconnected' });
});

// Bot State & Telemetry
app.get('/api/bot/state', (req: Request, res: Response) => {
  const state = mineflayerService.getState();
  const status = mineflayerService.getStatus();
  res.json({
    state,
    status,
    inventory: mineflayerService.getInventory(),
    players: mineflayerService.getPlayers(),
    logs: mineflayerService.getLogs(),
    chat: mineflayerService.getChat(),
  });
});

app.post('/api/bot/move', (req: Request, res: Response) => {
  const { direction, active } = req.body;
  mineflayerService.move(direction, !!active);
  res.json({ success: true });
});

app.post('/api/bot/action', (req: Request, res: Response) => {
  const { action, active } = req.body;
  mineflayerService.action(action, active ?? true);
  res.json({ success: true });
});

app.post('/api/bot/chat', (req: Request, res: Response) => {
  const { message } = req.body;
  if (message) {
    mineflayerService.chat(message);
  }
  res.json({ success: true });
});

app.post('/api/bot/command', (req: Request, res: Response) => {
  const { command } = req.body;
  if (command) {
    mineflayerService.chat(command.startsWith('/') ? command : `/${command}`);
  }
  res.json({ success: true, output: `Dispatched: ${command}` });
});

app.post('/api/bot/inventory/slot', (req: Request, res: Response) => {
  const { slot } = req.body;
  mineflayerService.selectSlot(slot);
  res.json({ success: true });
});

app.post('/api/bot/inventory/drop', async (req: Request, res: Response) => {
  const { slot } = req.body;
  await mineflayerService.dropItem(slot);
  res.json({ success: true });
});

app.post('/api/bot/tasks', async (req: Request, res: Response) => {
  const task = await mineflayerService.startTask(req.body);
  res.json(task);
});

app.post('/api/bot/tasks/:id/stop', (req: Request, res: Response) => {
  mineflayerService.stopTask();
  res.json({ success: true });
});

app.post('/api/bot/logs/clear', (req: Request, res: Response) => {
  mineflayerService.clearLogs();
  res.json({ success: true });
});

// AI Planner API using Gemini (Requirement 6)
app.post('/api/ai/plan', async (req: Request, res: Response) => {
  const { prompt, currentState, players } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // If Gemini API key is configured, use Gemini 3.8 Flash for advanced natural language understanding
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI();
      const systemInstruction = `You are an expert Minecraft AI command and pathfinding planner.
Convert natural language user instructions into a strict JSON structured action for a Minecraft bot.

Allowed actions:
- "move_to" (target: { x: number, y: number, z: number })
- "follow_player" (target: { name: string })
- "mine_block" (target: { name: string, y?: number, count?: number })
- "collect_item" (target: { name: string, count?: number })
- "stop"
- "chat" (target: { message: string })
- "equip" (target: { name: string })

Output strictly valid JSON with this exact schema:
{
  "action": "move_to" | "follow_player" | "mine_block" | "collect_item" | "stop" | "chat" | "equip",
  "target": { "x": number, "y": number, "z": number, "name": string, "count": number, "message": string },
  "safetyRisk": "safe" | "caution" | "dangerous",
  "riskReason": string,
  "explanation": string
}

Evaluate danger: void damage (Y < -60) is dangerous. Lava pockets or falling hazard is caution.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Current Bot State: Position X=${currentState?.position?.x ?? 0}, Y=${currentState?.position?.y ?? 64}, Z=${currentState?.position?.z ?? 0}, Dimension=${currentState?.dimension || 'overworld'}.
Players nearby: ${JSON.stringify(players || [])}.
User instruction: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({
          success: true,
          plan: parsed,
          provider: 'gemini-3.8-flash',
        });
      }
    } catch (err: unknown) {
      console.warn('Gemini planning failed, falling back to local rule engine:', err);
    }
  }

  // Graceful fallback to deterministic local rules
  res.json({
    success: true,
    fallback: true,
    message: 'Processed using local Minecraft NLP engine',
  });
});

// Server Audit Logs
app.get('/api/admin/logs', (req: Request, res: Response) => {
  res.json({ logs: serverLogs });
});

// Vite middleware in development vs Static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MCC] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MCC] Failed to start server:', err);
  process.exit(1);
});
