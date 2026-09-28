# BOTCLOUD Security Policy & Architecture

## Security Principles

1. **Authentication & Authorization**:
   - Authentication is handled exclusively through Firebase Authentication (Email/Password, Google OAuth).
   - Server-side admin verification: The designated permanent administrator `jeuxapk6@gmail.com` receives administrative privileges verified both in Firestore Security Rules and backend API validation.
   - Normal users can only view and modify their own bot records, subscription records, and logs.

2. **Server-Side Session Timers**:
   - The 24-hour Free session timer and Pro calendar month expiration are calculated and enforced using server-side timestamps (`startedAt` and `expiresAt`).
   - Client clock manipulation has zero effect on session expiration.

3. **Safe AI Execution**:
   - AI outputs are constrained strictly to structured JSON schemas (`move_to`, `follow_player`, `collect_item`, `mine_block`, `stop`, `chat`, `equip`).
   - No `eval()`, arbitrary JavaScript, or raw shell commands are ever executed from AI prompt responses.

4. **Bot Hosting & Policy Safety**:
   - BOTCLOUD is designed for compatible Minecraft servers where bot automation is permitted.
   - No anti-idle or server bypass exploits are implemented.

5. **Firestore Security Rules**:
   - Enforces user ownership (`request.auth.uid == userId`) on all collections.
   - Admin-only write access on `systemSettings`, `announcements`, and payment decision fields.
