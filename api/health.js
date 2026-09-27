export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Minecraft Control Center Serverless API',
    runtime: {
      platform: 'Vercel Serverless Functions',
      mode: process.env.BOT_RUNTIME_URL ? 'remote' : 'mock',
      persistentConfigured: !!process.env.BOT_RUNTIME_URL,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    },
  });
}
