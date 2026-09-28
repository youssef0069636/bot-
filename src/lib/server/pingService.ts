export interface PingResult {
  online: boolean;
  latency?: number;
  message: string;
  code?: string;
  players?: {
    online: number;
    max: number;
  };
  version?: string;
}

/**
 * Robust Minecraft server ping tester.
 * 1. Attempts backend TCP ping (/api/server/test-ping).
 * 2. If running on static host (e.g. Vercel) or if backend returns 405/error,
 *    gracefully falls back to public Minecraft status APIs (mcstatus.io).
 */
export async function pingMinecraftServer(host: string, port: number): Promise<PingResult> {
  const cleanHost = (host || 'localhost').trim();
  const cleanPort = port || 25565;

  if (!cleanHost) {
    return { online: false, message: 'Host address is required.' };
  }

  // 1. Try local server-side diagnostic ping (/api/server/test-ping)
  try {
    const res = await fetch('/api/server/test-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: cleanHost, port: cleanPort }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        online: !!data.online,
        latency: data.latency,
        message:
          data.message ||
          (data.online
            ? `Server is online (${data.latency}ms)! Port is open.`
            : data.error || 'Server is offline or unreachable.'),
        code: data.code,
        players: data.players,
        version: data.version,
      };
    }
  } catch {
    // If backend ping threw or unreachable, continue to fallback
  }

  // 2. Direct client-side fallback via public Minecraft status APIs (mcstatus.io)
  // This works everywhere, including purely static Vercel deployments!
  try {
    const queryTarget = `${encodeURIComponent(cleanHost)}:${cleanPort}`;
    const start = Date.now();
    const mcRes = await fetch(`https://api.mcstatus.io/v2/status/java/${queryTarget}`);

    if (mcRes.ok) {
      const data = await mcRes.json();
      const latency = Date.now() - start;

      if (data.online) {
        return {
          online: true,
          latency,
          message: `Server ${cleanHost}:${cleanPort} is ONLINE (${latency}ms)! Players: ${data.players?.online ?? 0}/${data.players?.max ?? 20}`,
          players: data.players ? { online: data.players.online, max: data.players.max } : undefined,
          version: data.version?.name_clean,
        };
      } else {
        return {
          online: false,
          message: `Server at ${cleanHost}:${cleanPort} is offline or unreachable.`,
        };
      }
    }
  } catch {
    // Secondary fallback to mcsrvstat.us
    try {
      const mcRes2 = await fetch(`https://api.mcsrvstat.us/2/${encodeURIComponent(cleanHost)}:${cleanPort}`);
      if (mcRes2.ok) {
        const data2 = await mcRes2.json();
        if (data2.online) {
          return {
            online: true,
            message: `Server ${cleanHost}:${cleanPort} is ONLINE! Players: ${data2.players?.online ?? 0}/${data2.players?.max ?? 20}`,
            players: data2.players,
            version: data2.version,
          };
        }
      }
    } catch {}
  }

  return {
    online: false,
    message: `Could not connect to ${cleanHost}:${cleanPort}. Check that the server is started and the port is correct.`,
  };
}
