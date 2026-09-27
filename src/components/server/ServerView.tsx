import React, { useState } from 'react';
import {
  Server,
  Activity,
  Cpu,
  Wifi,
  Users,
  Clock,
  Terminal,
  RefreshCw,
  Send,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ServerInfo } from '../../types/minecraft';
import { StandardServerProvider } from '../../lib/server/MinecraftServerProvider';
import { sounds } from '../../lib/audio';

interface ServerViewProps {
  serverInfo: ServerInfo;
  onRefresh?: () => void;
}

export const ServerView: React.FC<ServerViewProps> = ({ serverInfo, onRefresh }) => {
  const [rconInput, setRconInput] = useState('');
  const [rconOutput, setRconOutput] = useState<string>('RCON Gateway ready. Enter commands below.');
  const [isExecuting, setIsExecuting] = useState(false);
  const [provider] = useState(() => new StandardServerProvider(serverInfo.host, serverInfo.port));

  const handleExecuteRcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconInput.trim() || isExecuting) return;

    sounds.click(1.1);
    setIsExecuting(true);
    const cmd = rconInput;
    setRconInput('');

    try {
      const res = await provider.executeRconCommand(cmd);
      setRconOutput((prev) => `> /${cmd}\n${res.output}\n\n${prev}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Parse basic Minecraft MOTD color formatting codes (§a, §e, §6, §b, §f, §7)
  const formatMotd = (motdText: string) => {
    return motdText.split('\n').map((line, lineIdx) => {
      // Simple color tag replacement
      const parts = line.split(/(§[0-9a-fk-or])/g);
      let currentColor = 'text-zinc-200';

      return (
        <div key={lineIdx} className="leading-relaxed">
          {parts.map((p, idx) => {
            if (p.startsWith('§')) {
              const code = p.charAt(1);
              if (code === '6') currentColor = 'text-amber-500';
              else if (code === 'e') currentColor = 'text-yellow-400';
              else if (code === 'a') currentColor = 'text-emerald-400';
              else if (code === 'b') currentColor = 'text-cyan-400';
              else if (code === 'c') currentColor = 'text-red-400';
              else if (code === 'd') currentColor = 'text-pink-400';
              else if (code === '7') currentColor = 'text-zinc-400';
              else if (code === 'f') currentColor = 'text-white';
              return null;
            }
            return (
              <span key={idx} className={currentColor}>
                {p}
              </span>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Server className="w-5 h-5 text-emerald-400" /> Minecraft Server Management
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Server telemetry, MOTD preview, provider adapters, and remote RCON console.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => {
                sounds.click();
                onRefresh();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs flex items-center gap-1.5 transition-colors border border-zinc-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Query
            </button>
          )}
        </div>
      </div>

      {/* Primary Server Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Server Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${serverInfo.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
            <span className="text-lg font-bold text-zinc-100 font-mono">
              {serverInfo.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 mt-2 block">
            {serverInfo.host}:{serverInfo.port}
          </span>
        </div>

        {/* TPS */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Server Ticks Per Second (TPS)</span>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400 font-mono">{serverInfo.tps}</span>
            <span className="text-xs text-zinc-500 font-mono">/ 20.0</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 mt-2 block">100% Stability</span>
        </div>

        {/* Players */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Connected Players</span>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-2xl font-bold text-cyan-400 font-mono">{serverInfo.playersOnline}</span>
            <span className="text-xs text-zinc-500 font-mono">/ {serverInfo.playersMax}</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 mt-2 block">Cap: {serverInfo.playersMax} Max</span>
        </div>

        {/* Latency */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 block mb-1">Query Latency</span>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-bold text-zinc-100 font-mono">{serverInfo.latency}</span>
            <span className="text-xs text-zinc-500 font-mono">ms</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 mt-2 block">SLP Protocol 767</span>
        </div>
      </div>

      {/* MOTD & Specs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MOTD Preview */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Server MOTD & Banner
          </h3>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs shadow-inner">
            {formatMotd(serverInfo.motd)}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            Color formatting parsed dynamically from server description response.
          </p>
        </div>

        {/* Server Technical Details */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Technical Specification & Specs
          </h3>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Server Software:</span>
              <span className="text-zinc-200">{serverInfo.software || 'PaperMC 1.21.1'}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Java Runtime:</span>
              <span className="text-zinc-200">Java 21 (OpenJDK 64-Bit)</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Server Uptime:</span>
              <span className="text-zinc-200">{serverInfo.uptime}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Provider Adapter:</span>
              <span className="text-emerald-400">{provider.providerName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RCON Remote Console Deck */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> Remote Server Console (RCON)
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">Authenticated Session</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 h-40 overflow-y-auto whitespace-pre-wrap shadow-inner">
          {rconOutput}
        </div>

        <form onSubmit={handleExecuteRcon} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Execute server command (e.g. list, tps, say Maintenance in 5 minutes)..."
            value={rconInput}
            onChange={(e) => setRconInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isExecuting || !rconInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Dispatch
          </button>
        </form>
      </div>
    </div>
  );
};
