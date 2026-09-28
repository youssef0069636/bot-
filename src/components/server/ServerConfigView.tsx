import React, { useState, useEffect } from 'react';
import {
  Server,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Globe,
  Radio,
  Sliders,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { UserBot, SUPPORTED_MINECRAFT_VERSIONS } from '../../types/saas';
import { getOrCreateUserBot, updateBotServerConfig } from '../../lib/saas/botService';
import { botManager } from '../../lib/bot/BotManager';
import { sounds } from '../../lib/audio';

interface ServerConfigViewProps {
  onServerUpdated?: () => void;
}

export const ServerConfigView: React.FC<ServerConfigViewProps> = ({ onServerUpdated }) => {
  const { profile } = useAuth();
  const [bot, setBot] = useState<UserBot | null>(null);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState('25565');
  const [minecraftVersion, setMinecraftVersion] = useState('1.20.1');
  const [botUsername, setBotUsername] = useState('BotCloud_User');
  const [authMode, setAuthMode] = useState<'offline' | 'microsoft'>('offline');
  const [autoReconnect, setAutoReconnect] = useState(true);

  // Saving / Testing state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    online: boolean;
    latency?: number;
    message: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadBot();
  }, [profile?.id]);

  const loadBot = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const b = await getOrCreateUserBot(profile.id, profile.email, profile.displayName);
      setBot(b);
      setServerHost(b.serverHost);
      setServerPort(String(b.serverPort));
      setMinecraftVersion(b.minecraftVersion || '1.20.1');
      setBotUsername(b.username);
      setAuthMode(b.authMode || 'offline');
      setAutoReconnect(b.autoReconnect ?? true);
    } catch (err) {
      console.error('Error loading bot server settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPing = async () => {
    sounds.click();
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/server/test-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: serverHost.trim(), port: parseInt(serverPort, 10) || 25565 }),
      });
      const data = await res.json();
      if (data.online) {
        sounds.chime();
        setTestResult({
          online: true,
          latency: data.latency,
          message: data.message || `Server reachable (${data.latency}ms)! Port is open.`,
        });
      } else {
        sounds.error();
        setTestResult({
          online: false,
          message: data.error || 'Server is offline or port is unreachable.',
        });
      }
    } catch (err: any) {
      sounds.error();
      setTestResult({ online: false, message: `Ping failed: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    sounds.click(1.2);
    setIsSaving(true);
    setSuccessMsg('');

    try {
      let cleanHost = serverHost.trim();
      let cleanPort = parseInt(serverPort, 10) || 25565;

      if (cleanHost.includes(':')) {
        const parts = cleanHost.split(':');
        cleanHost = parts[0].trim();
        cleanPort = parseInt(parts[1], 10) || cleanPort;
        setServerHost(cleanHost);
        setServerPort(String(cleanPort));
      }

      const result = await updateBotServerConfig(profile.id, {
        serverHost: cleanHost,
        serverPort: cleanPort,
        minecraftVersion,
        username: botUsername.trim(),
        authMode,
        autoReconnect,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update botManager settings & reconnect if connected
      botManager.updateSettings({
        serverHost: cleanHost,
        serverPort: cleanPort,
        botUsername: botUsername.trim(),
        minecraftVersion,
        authType: authMode,
        autoReconnect,
      });

      sounds.chime();
      setSuccessMsg('Server settings saved successfully! Your bot is ready to connect.');
      if (onServerUpdated) onServerUpdated();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Minecraft Server Configuration</h2>
            <p className="text-[11px] text-zinc-400">
              Configure target server, port, and Minecraft version for your bot.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
          1 User = 1 Bot
        </span>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSaveAndSwitch} className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Server Host */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-bold">
              Server Host / IP Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
              placeholder="e.g. myserver.aternos.me or 192.168.1.100"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500 outline-none"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              For Aternos: Copy the dynamic IP shown under the Connect button.
            </span>
          </div>

          {/* Server Port */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-bold">
              Server Port <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              max={65535}
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              placeholder="25565"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500 outline-none"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Default standard port is 25565.</span>
          </div>

          {/* Minecraft Version Dropdown */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-bold">
              Minecraft Version <span className="text-red-400">*</span>
            </label>
            <select
              value={minecraftVersion}
              onChange={(e) => setMinecraftVersion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold focus:border-emerald-500 outline-none"
            >
              {SUPPORTED_MINECRAFT_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  Minecraft {v}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Select the matching protocol version of your server.
            </span>
          </div>

          {/* Bot Username */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-bold">Bot In-Game Username</label>
            <input
              type="text"
              required
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
              placeholder="Youssef_Bot"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500 outline-none"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">The player name the bot will use in-game.</span>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <div className="font-bold text-zinc-200">Authentication Mode</div>
              <div className="text-[10px] text-zinc-500">Offline (Cracked) or Microsoft</div>
            </div>
            <select
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 outline-none text-xs"
            >
              <option value="offline">Offline / Cracked</option>
              <option value="microsoft">Microsoft Account</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <div className="font-bold text-zinc-200">Auto Reconnect</div>
              <div className="text-[10px] text-zinc-500">Automatically retry on disconnect</div>
            </div>
            <input
              type="checkbox"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </div>
        </div>

        {/* Diagnostic Ping Test Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              testResult.online
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-red-950/40 text-red-300 border-red-800/60'
            }`}
          >
            {testResult.online ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div className="font-bold">{testResult.online ? 'Server is Online!' : 'Cannot Reach Server'}</div>
              <div className="text-[11px] mt-0.5 text-zinc-300">{testResult.message}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center gap-2 border border-zinc-700 transition-colors"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            Test Connection Ping
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-2 transition-colors shadow-lg"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save & Apply Server
          </button>
        </div>
      </form>
    </div>
  );
};
