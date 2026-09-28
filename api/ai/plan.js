import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
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

  const { prompt, currentState, players } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({});
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
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Current Bot State: Position X=${currentState?.position?.x ?? 0}, Y=${currentState?.position?.y ?? 64}, Z=${currentState?.position?.z ?? 0}. Players nearby: ${JSON.stringify(players || [])}. User instruction: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      if (response.text) {
        return res.status(200).json({
          success: true,
          plan: JSON.parse(response.text),
          provider: 'gemini-2.5-flash',
        });
      }
    } catch (err) {
      console.warn('Gemini planning error on Vercel:', err);
    }
  }

  // Fallback to local rule engine
  const lower = prompt.toLowerCase();
  let action = 'chat';
  let target = { message: `Acknowledged: ${prompt}` };
  let explanation = `Echoing user command: "${prompt}"`;
  let safetyRisk = 'safe';

  if (lower.includes('stop') || lower.includes('halt') || lower.includes('وقف')) {
    action = 'stop';
    explanation = 'Stopping all bot movement and ongoing tasks.';
  } else if (lower.includes('come') || lower.includes('follow') || lower.includes('تبع')) {
    action = 'follow_player';
    target = { name: players?.[0]?.username || 'Player' };
    explanation = `Following closest player ${target.name}.`;
  }

  return res.status(200).json({
    success: true,
    plan: {
      action,
      target,
      safetyRisk,
      riskReason: 'Evaluated locally',
      explanation,
    },
    provider: 'local-rules-fallback',
  });
}
