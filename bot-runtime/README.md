# Minecraft Control Center - Persistent Bot Runtime Daemon

## Why a Separate Runtime?
Vercel and serverless architectures are designed for stateless, request-response execution cycles (max execution time ~10-60s). Minecraft bots (like Mineflayer) require a **continuous, persistent TCP socket connection** to the Minecraft server to keep the player entity in the world, handle physics ticks, pathfind, and receive real-time packets.

This architecture decouples the frontend dashboard from the persistent bot runtime:

```
[ Vercel Web Dashboard / API ]
          │
          ▼ (Authenticated REST / WebSocket)
[ Persistent Daemon (Docker / Railway / VPS) ]
          │
          ▼ (Persistent TCP Minecraft Protocol)
[ Minecraft Server (Paper / Spigot / Vanilla) ]
```

## Quick Start Locally

1. Enter directory:
   ```bash
   cd bot-runtime
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env`:
   ```env
   PORT=4000
   BOT_API_KEY=your_secure_bearer_token
   MC_HOST=mc.yourserver.net
   MC_PORT=25565
   MC_USERNAME=ControlDeckBot
   MC_VERSION=1.21.1
   ```
4. Run:
   ```bash
   node standalone-daemon.js
   ```

5. In the **Minecraft Control Center** web dashboard:
   - Navigate to **Settings**
   - Set **Persistent Runtime URL** to `http://localhost:4000`
   - Set **API Key** to `your_secure_bearer_token`
   - Switch active mode from **Demo Mode** to **Live Bot**!

## Deploying to Railway / Render / Fly.io / VPS

### Using Docker:
```bash
docker build -t mcc-daemon .
docker run -p 4000:4000 -e BOT_API_KEY=secret-token-123 -e MC_HOST=mc.myserver.com mcc-daemon
```

### Railway:
1. Push this folder to a GitHub repository or connect via Railway CLI.
2. Add environment variables: `BOT_API_KEY`, `MC_HOST`, `MC_PORT`, `MC_USERNAME`.
3. Railway automatically detects the Dockerfile or Node.js project.
4. Copy the generated Railway public domain (e.g., `https://mcc-daemon.up.railway.app`) into the dashboard Settings.
