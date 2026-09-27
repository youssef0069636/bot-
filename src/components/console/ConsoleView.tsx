import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Trash2,
  Copy,
  Download,
  Check,
  Send,
  ArrowDown,
  Monitor,
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../types/minecraft';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { sounds } from '../../lib/audio';

interface ConsoleViewProps {
  logs: LogEntry[];
  adapter: BotAdapter;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, adapter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [crtEffect, setCrtEffect] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCmd = commandInput.trim();
    if (!cleanCmd) return;

    sounds.click(1.1);
    setHistory((prev) => [cleanCmd, ...prev.slice(0, 30)]);
    setHistoryIdx(-1);
    setCommandInput('');

    await adapter.executeCommand(cleanCmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(history.length - 1, historyIdx + 1);
        setHistoryIdx(nextIdx);
        setCommandInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setCommandInput(history[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setCommandInput('');
      }
    }
  };

  const handleCopyLogs = () => {
    sounds.click();
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .reverse()
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    sounds.pop();
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .reverse()
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft-console-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.level.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400 bg-red-950/60 border-red-800/60';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
      case 'BOT':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60';
      case 'SERVER':
        return 'text-purple-400 bg-purple-950/60 border-purple-800/60';
      case 'CHAT':
        return 'text-yellow-400 bg-yellow-950/60 border-yellow-800/60';
      default:
        return 'text-zinc-400 bg-zinc-800/60 border-zinc-700/60';
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Console Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100 font-mono">Live Minecraft Terminal</h2>
          <span className="text-[10px] font-mono text-zinc-500">({filteredLogs.length} events)</span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search console..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-emerald-500/60 w-36 sm:w-48"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-1">
            {(['ALL', 'INFO', 'BOT', 'SERVER', 'CHAT', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  sounds.click();
                  setSelectedLevel(lvl);
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors border ${
                  selectedLevel === lvl
                    ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-zinc-800">
            <button
              onClick={() => {
                sounds.click();
                setCrtEffect(!crtEffect);
              }}
              className={`p-1.5 rounded transition-colors border ${
                crtEffect
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Toggle CRT Retro Screen Effect"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyLogs}
              className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
              title="Copy All Logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownloadLogs}
              className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
              title="Download Logs as .log file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                sounds.click();
                adapter.clearLogs();
              }}
              className="p-1.5 rounded bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors"
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        className={`flex-1 rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs overflow-y-auto relative shadow-inner ${
          crtEffect ? 'crt-scanlines' : ''
        }`}
      >
        <div className="space-y-1">
          {filteredLogs.slice().reverse().map((log) => (
            <div key={log.id} className="flex items-start gap-2 hover:bg-zinc-900/60 p-0.5 rounded leading-relaxed">
              <span className="text-zinc-600 select-none">[{log.timestamp}]</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase select-none ${getLevelBadgeClass(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <span className="text-zinc-300 break-all">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Command Input Prompt Form */}
      <form onSubmit={handleSendCommand} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold text-sm">
            &gt;
          </span>
          <input
            type="text"
            placeholder="Enter command (e.g. /gamemode creative, /tp 100 64 200, /time set day, /help)..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-emerald-500/60 shadow-lg"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Execute
        </button>
      </form>
    </div>
  );
};
