import net from 'net';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { host, port } = req.body || {};
  const targetHost = (host || 'localhost').trim();
  const targetPort = parseInt(port || '25565', 10);

  if (!targetHost) {
    return res.status(400).json({ success: false, error: 'Host is required' });
  }

  // 1. Direct TCP Socket check
  const tcpPromise = new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (!settled) {
        settled = true;
        try { socket.destroy(); } catch {}
        resolve(result);
      }
    };

    socket.setTimeout(3500);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      finish({
        success: true,
        online: true,
        latency,
        message: `Successfully connected to ${targetHost}:${targetPort}! Port is open.`,
      });
    });

    socket.on('timeout', () => {
      finish({
        success: false,
        online: false,
        error: `Connection timed out after 3500ms. Server at ${targetHost}:${targetPort} may be offline.`,
      });
    });

    socket.on('error', (err) => {
      let advice = err.message;
      if (err.code === 'ECONNREFUSED') {
        advice = `Port ${targetPort} is closed or rejected connection. Make sure the Minecraft server is started.`;
      } else if (err.code === 'ENOTFOUND') {
        advice = `Host "${targetHost}" could not be resolved. Please check hostname.`;
      }
      finish({
        success: false,
        online: false,
        error: advice,
        code: err.code,
      });
    });

    try {
      socket.connect(targetPort, targetHost);
    } catch (err) {
      finish({ success: false, online: false, error: err.message });
    }
  });

  const tcpResult = await tcpPromise;
  if (tcpResult.online) {
    return res.status(200).json(tcpResult);
  }

  // 2. Fallback to public Minecraft server status query (mcstatus.io)
  try {
    const mcRes = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(targetHost)}:${targetPort}`);
    if (mcRes.ok) {
      const mcData = await mcRes.json();
      if (mcData.online) {
        return res.status(200).json({
          success: true,
          online: true,
          latency: 45,
          message: `Server ${targetHost}:${targetPort} is ONLINE (Players: ${mcData.players?.online ?? 0}/${mcData.players?.max ?? 20})`,
          players: mcData.players,
          version: mcData.version?.name_clean,
        });
      }
    }
  } catch {
    // Ignore fallback fetch error
  }

  return res.status(200).json(tcpResult);
}
