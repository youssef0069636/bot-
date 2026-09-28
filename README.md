# BOTCLOUD - Minecraft Bot Management SaaS Platform

**BOTCLOUD** is a production-grade multi-user SaaS platform where registered users deploy, control, monitor, and automate their own dedicated Minecraft bot across custom servers and protocol versions.

---

## 🌟 Key Features

1. **One User = One Bot Enforcement**:
   - Each registered user receives exactly one dedicated bot profile in Firestore.
   - Users configure server host, port, protocol version (`1.16.5` through `1.21.1`), and credentials.
   - Smooth server switching (safely disconnects previous server before connecting to new).

2. **Multi-Tier Subscriptions**:
   - **FREE (0 DH)**: 24-hour continuous runtime per session. Server-side timestamp validation. Upon expiration, the bot stops and the user can launch a new 24-hour session immediately.
   - **PRO (40 DH / 1 Month)**: 30 days continuous bot execution, auto-reconnect, priority AI planner, and WhatsApp support.
   - **ULTRA (79 DH / Lifetime)**: Permanent lifetime access with VIP priority queue and future bot capabilities.

3. **Manual WhatsApp Payment Verification**:
   - Frictionless payment flow with unique invoice reference codes.
   - Proof submission form with instant pending status in Firestore.
   - Admin 1-click **Approve** (with automated expiration / lifetime calculation) or **Reject** (with reason).

4. **Super-Admin Dashboard (`/admin`)**:
   - Restricted to `jeuxapk6@gmail.com` with server-side authorization.
   - Live metrics (Total Users, Free/Pro/Ultra distribution, Active/Offline bots, Pending Payments, Revenue).
   - User search & management, plan overrides, account suspension.
   - Bot configuration repair and remote server switching.
   - System broadcast announcements & Maintenance mode toggle.

5. **Minecraft Bot Runtime Architecture**:
   - Powered by real **Mineflayer** engine with **mineflayer-pathfinder**, **mineflayer-pvp**, and **vec3**.
   - Modular `BotAdapter` interface separating the SaaS web/API tier (Vercel compatible) from persistent bot execution.
   - Full WASD + mobile virtual joystick, hotbar selection, inventory inspector, entity radar, chat & custom aliases (`!menu`, `!shield_me`, `!build_house`, `!clear_monsters`, etc.).
   - Structured **Gemini AI Planner** for autonomous task execution without arbitrary code execution.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend & Database**: Firebase Authentication, Cloud Firestore, Express API proxy.
- **Bot Engine**: Node.js, Mineflayer, Pathfinder, PvP.
- **AI Planning**: Google Gen AI SDK (`gemini-2.5-flash`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- Firebase project with Firestore and Authentication enabled.

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and fill in:
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 4. Running Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm start
```
