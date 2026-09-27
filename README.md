# Minecraft Control Center

> Production-ready modern web dashboard to monitor and control Minecraft bots and servers with AI assistant, real-time controls, autonomous task manager, and decoupled persistent runtime adapters.

---

## Table of Contents

1. [Features Overview](#1-features-overview)
2. [Architecture: Vercel vs. Persistent Daemon](#2-architecture-vercel-vs-persistent-daemon)
3. [Quick Start & Local Development](#3-quick-start--local-development)
4. [Environment Variables](#4-environment-variables)
5. [Demo / Mock Mode](#5-demo--mock-mode)
6. [Mineflayer Persistent Daemon Deployment](#6-mineflayer-persistent-daemon-deployment)
7. [Vercel Deployment Guide](#7-vercel-deployment-guide)
8. [AI Assistant & Safety Planner](#8-ai-assistant--safety-planner)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Features Overview

- **Real-Time Telemetry**: Live HP hearts, food drumsticks, armor shields, oxygen level, 3D XYZ coordinates, dimension, biome, TPS (20.0), and ping.
- **Bot Control Deck**:
  - Desktop keyboard controls (`W`, `A`, `S`, `D`, `Space` for jump, `Shift` for sneak, `Ctrl` for sprint, `Q` for drop, `F` for hand swap, `1-9` for hotbar).
  - Mobile touch virtual D-Pad, combat attack pad, interact/use buttons, and hotbar strip.
- **Autonomous Task Manager**:
  - Follow player, navigate to coordinates, return to spawn, patrol area, guard position, and mine blocks.
  - Live progress tracking, pause, resume, stop, and retry controls.
- **AI Command Assistant**:
  - Natural language planning powered by Gemini (`gemini-3.8-flash`) and local deterministic fallback.
  - Multi-tier safety verification: blocks void damage (Y < -60) and alerts on danger.
- **Live Terminal Console**:
  - Color-coded log streaming (`INFO`, `WARN`, `ERROR`, `SUCCESS`, `BOT`, `SERVER`, `CHAT`).
  - Search, level filters, log export (.log download & copy), and interactive command prompt.
- **Visual Minecraft Inventory**:
  - Armor slots, offhand shield slot, 27 storage slots, and 9 hotbar slots with durability bars and enchantments.
- **Player Radar**:
  - Shows connected players, real-time distance, health, online status, and 1-click follow.
- **Server Gateway**:
  - MOTD preview with Minecraft color code styling (`§a`, `§e`, `§6`), latency graph, and remote RCON console.
- **Retro Audio Synthesis**:
  - Pure Web Audio API synthesized Minecraft clicks, sword attacks, item pops, and xp chimes.
- **Dark, Light & Matrix Neon Themes**.

---

## 2. Architecture: Vercel vs. Persistent Daemon

Serverless platforms like Vercel execute functions statelessly on-demand with execution timeouts (10-60s). A Minecraft bot (Mineflayer) requires a **continuous, persistent TCP socket connection** (25565) to keep the entity alive in the world, handle physics ticks, and process packet streams.

This application uses a clean decoupled architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 Vercel / Cloud Run Dashboard                │
│  - React 19 + TypeScript + Tailwind CSS                     │
│  - Serverless API Routes (/api/health, /api/ai/plan)        │
│  - BotAdapter Abstraction (MockBotAdapter & RemoteBotAdapter)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS Bearer Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Persistent Bot Daemon (Docker / Railway / VPS)     │
│  - Located in `bot-runtime/standalone-daemon.js`            │
│  - Node.js + Mineflayer + mineflayer-pathfinder             │
│  - REST & WebSocket bridge server                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ TCP Protocol 767 (Port 25565)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Target Minecraft Server (Paper / Spigot / Vanilla) │
└─────────────────────────────────────────────────────────────┘
```

When no external daemon is running, the dashboard automatically runs in **Interactive Demo Mode**, allowing full UI testing with simulated physics, coordinates, and tasks.

---

## 3. Quick Start & Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or bun

### Run Full-Stack Web Dashboard
```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Express + Vite on http://localhost:3000)
npm run dev

# 3. Build for production
npm run build

# 4. Run production server
npm start
```

---

## 4. Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
# Optional Gemini API key for advanced natural language reasoning
GEMINI_API_KEY="your-gemini-key"

# Port (defaults to 3000)
PORT="3000"

# Optional remote daemon endpoint & API key
BOT_RUNTIME_URL=""
BOT_API_KEY=""

# Default Minecraft Server
MC_HOST="mc.hypixel.net"
MC_PORT="25565"
```

---

## 5. Demo / Mock Mode

Out of the box, `MockBotAdapter` provides:
- Fully functional WASD and touch movement updating real coordinates (e.g. `X: 128.4, Y: 64.0, Z: -212.6`).
- Interactive jumping with gravitational trajectory.
- Inventory populated with Diamond Sword, Netherite Chestplate, Totem of Undying, Steak, etc.
- Step-by-step task execution moving towards targets with live progress bars.
- In-game chat and simulated player responses from "Steve".

Toggle between **Demo Mode** and **Live Bot** anytime via the sidebar switch or the Settings tab!

---

## 6. Mineflayer Persistent Daemon Deployment

The standalone persistent daemon is located in the `bot-runtime/` directory.

### Running Locally:
```bash
cd bot-runtime
npm install
node standalone-daemon.js
```

### Deploying to Railway / Render / VPS via Docker:
```bash
cd bot-runtime
docker build -t mcc-daemon .
docker run -p 4000:4000 \
  -e BOT_API_KEY="my-secret-key" \
  -e MC_HOST="mc.yourserver.net" \
  -e MC_USERNAME="Bot_ControlDeck" \
  mcc-daemon
```

In the dashboard, open **Settings**, set **Persistent Runtime URL** to `http://localhost:4000` (or your Railway domain), enter your **API Key**, and click **Save Configuration**.

---

## 7. Vercel Deployment Guide

1. Push this repository to GitHub or GitLab.
2. In the Vercel Dashboard, click **New Project** and import the repository.
3. Configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `GEMINI_API_KEY` (optional)
   - `BOT_RUNTIME_URL` (optional, pointing to your persistent daemon)
   - `BOT_API_KEY` (optional)
5. Click **Deploy**. Vercel will build the frontend and serve `/api/health` via `api/health.js` serverless function!

---

## 8. AI Assistant & Safety Planner

The AI assistant follows a validated command pipeline:
```
User Prompt ("Go to the village")
       │
       ▼
Gemini 3.8 Flash (or Local Rule Engine)
       │
       ▼
Structured Action Schema { action: "move_to", target: { x: 280, y: 68, z: -140 } }
       │
       ▼
Safety Risk Analysis (Void check, Lava check, Falling distance)
       │
       ▼
Operator Authorization / Execution
       │
       ▼
BotAdapter (Dispatched to Mineflayer or Mock)
```

Arbitrary code execution or `eval()` is strictly prohibited.

---

## 9. Role-Based Access Control (RBAC)

Default accounts for testing:
- **Lead Administrator**: `admin` / `minecraft123` (Full permissions + `/admin` panel access)
- **Bot Operator**: `alex` / `steve123` (Controls, tasks, and combat)
- **Observer**: `guest` / `guest123` (Read-only telemetry)

---

## 10. Troubleshooting & FAQ

- **"Persistent bot runtime is not configured"**:
  This appears when in Remote mode without a valid daemon URL. Switch back to **Demo Mode** in the sidebar, or configure your daemon URL in **Settings**.
- **Movement keys not registering**:
  Ensure you are not currently focused on an input box or textarea. Click anywhere on the dashboard background to regain keyboard focus.
- **Port conflicts on 3000**:
  Set `PORT=3001` in `.env` or run with `PORT=3001 npm run dev`.
