export default function handler(req, res) {
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

  res.status(200).json({
    state: {
      connected: false,
      mode: 'remote',
      username: 'BotCloud_User',
      status: 'offline',
      health: 20,
      maxHealth: 20,
      food: 20,
      saturation: 5,
      armor: 0,
      oxygen: 20,
      position: { x: 0, y: 64, z: 0, yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      dimension: 'overworld',
      biome: 'Plains',
      ping: 0,
      currentTask: null,
      selectedSlot: 0,
      sneaking: false,
      sprinting: false,
      isGrounded: true,
      lastUpdated: new Date().toISOString(),
    },
    status: {
      connected: false,
      isConnecting: false,
      lastError: null,
      lastDisconnectReason: null,
    },
    inventory: {
      items: [],
      selectedSlot: 0,
      heldItem: null,
      armor: { helmet: null, chestplate: null, leggings: null, boots: null },
      offhand: null,
    },
    players: [],
    logs: [],
    chat: [],
  });
}
