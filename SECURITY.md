# Minecraft Control Center - Security Architecture & Threat Model

This document outlines the security architecture, threat model, authorization boundaries, and defense-in-depth principles implemented in **Minecraft Control Center**.

---

## 1. Architectural Separation (Vercel vs. Persistent Daemon)

Serverless execution environments (like Vercel Functions) have ephemeral execution windows (typically 10-60 seconds) and cannot maintain persistent TCP socket connections to a Minecraft server.

Attempting to run a persistent bot inside a serverless handler leads to zombie sockets, connection drops, and potential security leaks.

To resolve this safely:
1. **Frontend & Serverless API (Vercel)**:
   - Stateless, short-lived, immutable deployments.
   - Enforces user session authentication, role checks, and structured command validation.
   - Communicates with the external bot daemon via **authenticated Bearer tokens** over HTTPS/WSS.
2. **Persistent Bot Daemon (Docker / Railway / VPS)**:
   - Runs in an isolated container.
   - Communicates directly with the Minecraft server over the Minecraft TCP protocol (25565).
   - Validates incoming API keys and restricts command execution.

---

## 2. Zero Arbitrary Code Execution (No `eval`)

- **Strict Command Parser**: The AI assistant and user chat do NOT execute arbitrary JavaScript, Node `eval()`, or shell commands.
- **Structured Action Validation**: Natural language requests from users or AI models (`gemini-3.8-flash`) must parse into a strictly typed `AIStructuredAction` schema:
  ```json
  {
    "action": "move_to" | "follow_player" | "mine_block" | "collect_item" | "stop" | "chat",
    "target": { "x": 120, "y": 64, "z": -32 }
  }
  ```
- **Safety Risk Engine**:
  - Void danger: Requests directing the bot below Y = -60 are flagged as `dangerous` to prevent fatal falling out of the world.
  - Nether ceiling: Coordinates above Y = 127 in the Nether are flagged as `caution`.
  - Unloaded chunks: Coordinates exceeding 500 blocks away require explicit user confirmation.

---

## 3. Authentication & Role-Based Access Control (RBAC)

Three distinct permission tiers are supported:
1. **Admin (`admin`)**:
   - Access to `/admin` dashboard.
   - User role modification.
   - Server RCON dispatch and daemon configuration.
2. **Operator (`operator`)**:
   - Movement controls (WASD, Jump, Sneak, Sprint).
   - Combat, item drop, inventory management.
   - AI Task initialization and waypoint navigation.
3. **Viewer (`viewer`)**:
   - Read-only telemetry, map coordinates, and log monitoring.

---

## 4. Secret & Environment Variable Management

- Private daemon keys (`BOT_API_KEY`), AI keys (`GEMINI_API_KEY`), and server RCON passwords are stored strictly in server-side environment variables.
- No secrets are baked into client-side bundles or `VITE_` public variables.
- In Demo / Mock Mode, the application operates purely with in-memory state without requiring any external keys.

---

## 5. Input Sanitization & Minecraft Command Guards

- All user input submitted to `/api/bot/chat` or the console is sanitized to strip malicious control characters and CRLF injection.
- Commands starting with `/` are matched against an allowed command whitelist before dispatching to the Minecraft server or RCON gateway.
