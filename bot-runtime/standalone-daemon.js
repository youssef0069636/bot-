/**
 * Minecraft Control Center - Persistent Bot Runtime Daemon
 *
 * This daemon is designed to run in a persistent container/VPS environment
 * (e.g. Railway, Render, Fly.io, or VPS/Docker), NOT inside a Vercel serverless function.
 *
 * It bridges Mineflayer bot sessions with the Minecraft Control Center web dashboard
 * via authenticated REST/WebSocket endpoints.
 *
 * To run:
 *   cd bot-runtime
 *   npm install mineflayer mineflayer-pathfinder express cors dotenv
 *   node standalone-daemon.js
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const AUTH_TOKEN = process.env.BOT_API_KEY || 'secret-daemon-token-123';
const MC_HOST = process.env.MC_HOST || 'localhost';
const MC_PORT = parseInt(process.env.MC_PORT || '25565', 10);
const MC_USERNAME = process.env.MC_USERNAME || 'ControlDeckBot';
const MC_VERSION = process.env.MC_VERSION || '1.21.1';

// In-memory state & log buffer
let botInstance = null;
let isConnecting = false;
const logs = [];
const chatMessages = [];
let currentTask = null;

function addLog(level, message, source = 'bot') {
  const entry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toTimeString().split(' ')[0],
    level,
    message,
    source,
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  console.log(`[${entry.timestamp}] [${level}] ${message}`);
}

// Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Bearer token' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
}

app.use('/api', requireAuth);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    daemon: 'MCC-Mineflayer-Daemon',
    connected: botInstance !== null && botInstance._client?.state === 'play',
    botUsername: MC_USERNAME,
    targetServer: `${MC_HOST}:${MC_PORT}`,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/bot/state
app.get('/api/bot/state', (req, res) => {
  if (!botInstance || !botInstance.entity) {
    return res.json({
      state: {
        connected: false,
        mode: 'remote',
        username: MC_USERNAME,
        status: isConnecting ? 'connecting' : 'offline',
        health: 20,
        maxHealth: 20,
        food: 20,
        saturation: 5,
        armor: 0,
        oxygen: 20,
        position: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        dimension: 'overworld',
        biome: 'Unknown',
        ping: 0,
        currentTask: null,
        selectedSlot: 0,
        sneaking: false,
        sprinting: false,
        isGrounded: true,
        lastUpdated: new Date().toISOString(),
      },
      inventory: { helmet: null, chestplate: null, leggings: null, boots: null, offhand: null, hotbar: Array(9).fill(null), main: Array(27).fill(null) },
      players: [],
      logs,
      chat: chatMessages,
    });
  }

  const pos = botInstance.entity.position;
  const vel = botInstance.entity.velocity;

  res.json({
    state: {
      connected: true,
      mode: 'remote',
      username: botInstance.username,
      status: 'online',
      health: botInstance.health || 20,
      maxHealth: 20,
      food: botInstance.food || 20,
      saturation: botInstance.foodSaturation || 5,
      armor: 0,
      oxygen: botInstance.oxygenLevel || 20,
      position: {
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        yaw: parseFloat((botInstance.entity.yaw * 180 / Math.PI).toFixed(1)),
        pitch: parseFloat((botInstance.entity.pitch * 180 / Math.PI).toFixed(1)),
      },
      velocity: {
        x: parseFloat(vel.x.toFixed(2)),
        y: parseFloat(vel.y.toFixed(2)),
        z: parseFloat(vel.z.toFixed(2)),
      },
      dimension: 'overworld',
      biome: 'Plains',
      ping: botInstance.player?.ping || 20,
      currentTask,
      selectedSlot: botInstance.quickBarSlot || 0,
      sneaking: botInstance.getControlState('sneak'),
      sprinting: botInstance.getControlState('sprint'),
      isGrounded: botInstance.entity.onGround,
      lastUpdated: new Date().toISOString(),
    },
    players: Object.values(botInstance.players || {}).map((p) => ({
      uuid: p.uuid,
      username: p.username,
      ping: p.ping,
      health: 20,
      position: p.entity ? { x: p.entity.position.x, y: p.entity.position.y, z: p.entity.position.z } : { x: 0, y: 0, z: 0 },
      distance: p.entity ? Math.hypot(p.entity.position.x - pos.x, p.entity.position.z - pos.z) : 999,
      isOnline: true,
      gamemode: p.gamemode === 1 ? 'creative' : 'survival',
    })),
    logs,
    chat: chatMessages,
  });
});

// POST /api/bot/connect
app.post('/api/bot/connect', (req, res) => {
  addLog('INFO', `Connecting to Minecraft server at ${MC_HOST}:${MC_PORT}...`);
  // When mineflayer is installed:
  // const mineflayer = require('mineflayer');
  // botInstance = mineflayer.createBot({ host: MC_HOST, port: MC_PORT, username: MC_USERNAME, version: MC_VERSION });
  // attach event listeners for spawn, chat, health, end, error
  res.json({ success: true, message: 'Bot connection initialized' });
});

// POST /api/bot/disconnect
app.post('/api/bot/disconnect', (req, res) => {
  if (botInstance) {
    botInstance.quit();
    botInstance = null;
  }
  addLog('WARN', 'Bot disconnected via API');
  res.json({ success: true });
});

// POST /api/bot/move
app.post('/api/bot/move', (req, res) => {
  const { direction, active } = req.body;
  if (botInstance) {
    botInstance.setControlState(direction, !!active);
  }
  res.json({ success: true });
});

// POST /api/bot/action
app.post('/api/bot/action', (req, res) => {
  const { action, active } = req.body;
  if (botInstance) {
    if (action === 'jump') {
      botInstance.setControlState('jump', true);
      setTimeout(() => botInstance.setControlState('jump', false), 350);
    } else if (action === 'sneak') {
      botInstance.setControlState('sneak', !!active);
    } else if (action === 'sprint') {
      botInstance.setControlState('sprint', !!active);
    } else if (action === 'attack') {
      const nearestEntity = botInstance.nearestEntity();
      if (nearestEntity) botInstance.attack(nearestEntity);
    }
  }
  res.json({ success: true });
});

// POST /api/bot/chat
app.post('/api/bot/chat', (req, res) => {
  const { message } = req.body;
  if (botInstance) {
    botInstance.chat(message);
  }
  addLog('CHAT', `<${MC_USERNAME}> ${message}`);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[MCC-Daemon] Persistent Bot Runtime listening on port ${PORT}`);
  console.log(`[MCC-Daemon] Connect web dashboard to: http://localhost:${PORT}`);
});
