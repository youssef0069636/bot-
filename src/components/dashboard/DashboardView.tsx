import React, { useState } from 'react';
import {
  Activity,
  Server,
  Shield,
  Compass,
  Copy,
  Check,
  MapPin,
  Play,
  Square,
  Users,
  Wifi,
  Sparkles,
  Zap,
  Globe2,
  TreePine,
  RotateCcw,
} from 'lucide-react';
import { BotMode, BotState, PlayerInfo, ServerInfo } from '../../types/minecraft';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { botManager } from '../../lib/bot/BotManager';
import { HeartIcon, FoodIcon, ArmorIcon } from '../common/MinecraftIcons';
import { ServerConnectionWizard } from '../common/ServerConnectionWizard';
import { sounds } from '../../lib/audio';

import { ActiveTab } from '../layout/Sidebar';

interface DashboardViewProps {
  botState: BotState;
  serverInfo: ServerInfo;
  players: PlayerInfo[];
  adapter: BotAdapter;
  mode: BotMode;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  botState,
  serverInfo,
  players,
  adapter,
  mode,
  onNavigateTab,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isTogglingConnect, setIsTogglingConnect] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const handleCopyCoords = () => {
    sounds.click();
    navigator.clipboard.writeText(
      `/tp ${botState.position.x} ${botState.position.y} ${botState.position.z}`
    );
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleToggleConnection = async () => {
    sounds.click();
    setIsTogglingConnect(true);
    try {
      if (botState.connected) {
        await adapter.disconnect();
      } else {
        await botManager.connectBot();
      }
    } finally {
      setIsTogglingConnect(false);
    }
  };

  const handleStopTask = async () => {
    sounds.click();
    if (botState.currentTask) {
      await adapter.stopTask(botState.currentTask.id);
    }
  };

  // Calculate compass direction (0=South, 90=West, 180=North, 270=East)
  const getCompassHeading = (yaw = 0): string => {
    const normalized = (yaw % 360 + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'South (+Z)';
    if (normalized >= 22.5 && normalized < 67.5) return 'South-West';
    if (normalized >= 67.5 && normalized < 112.5) return 'West (-X)';
    if (normalized >= 112.5 && normalized < 157.5) return 'North-West';
    if (normalized >= 157.5 && normalized < 202.5) return 'North (-Z)';
    if (normalized >= 202.5 && normalized < 247.5) return 'North-East';
    if (normalized >= 247.5 && normalized < 292.5) return 'East (+X)';
    return 'South-East';
  };

  // Render 10 hearts
  const renderHearts = () => {
    const hearts = [];
    const hp = Math.max(0, Math.min(20, botState.health));
    for (let i = 0; i < 10; i++) {
      const heartValue = (i + 1) * 2;
      let type: 'full' | 'half' | 'empty' = 'empty';
      if (hp >= heartValue) {
        type = 'full';
      } else if (hp >= heartValue - 1) {
        type = 'half';
      }
      hearts.push(<HeartIcon key={i} type={type} className="w-4 h-4 transition-transform hover:scale-110" />);
    }
    return hearts;
  };

  // Render 10 food drumsticks
  const renderFood = () => {
    const drumsticks = [];
    const hunger = Math.max(0, Math.min(20, botState.food));
    for (let i = 0; i < 10; i++) {
      const foodValue = (i + 1) * 2;
      let type: 'full' | 'half' | 'empty' = 'empty';
      if (hunger >= foodValue) {
        type = 'full';
      } else if (hunger >= foodValue - 1) {
        type = 'half';
      }
      drumsticks.push(<FoodIcon key={i} type={type} className="w-4 h-4 transition-transform hover:scale-110" />);
    }
    return drumsticks;
  };

  // Render armor points
  const renderArmor = () => {
    const armorPoints = Math.round(botState.armor / 2);
    const shields = [];
    for (let i = 0; i < 10; i++) {
      shields.push(
        <div key={i} className={i < armorPoints ? 'opacity-100' : 'opacity-25'}>
          <ArmorIcon className="w-3.5 h-3.5" />
        </div>
      );
    }
    return shields;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice for Runtime Architecture */}
      {mode === 'mock' ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-zinc-200">
              <strong className="text-amber-400 font-mono">وضع المحاكاة التفاعلي (DEMO MODE):</strong> البوت يعمل داخل المتصفح بمحاكاة كاملة. للاتصال بسيرفر ماينكرافت حقيقي (Aternos / Localhost / Paper)، اضغط على الزر:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.click();
                botManager.setMode('remote');
                setShowWizard(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] whitespace-nowrap transition-colors shadow-md"
            >
              الاتصال بسيرفر حقيقي (Live Server) →
            </button>
            <button
              onClick={() => onNavigateTab('settings')}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              الإعدادات
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${botState.connected ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
            <span className="text-zinc-200">
              <strong className="text-cyan-400 font-mono">
                {botState.connected ? 'البوت متصل بالسيرفر بنجاح!' : 'وضع الاتصال بالسيرفر الحقيقي (LIVE MINEFLAYER):'}
              </strong>{' '}
              {botState.connected
                ? `البوت متواجد حالياً في العالم عند الإحداثيات (${botState.position.x}, ${botState.position.y}, ${botState.position.z})`
                : 'إذا واجهت مشكلة في الدخول، استخدم أداة فحص الاتصال بالأسفل للتحقق من المنفذ وحالة السيرفر.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.click();
                setShowWizard(!showWizard);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              {showWizard ? 'إخفاء أداة الفحص ▲' : 'أداة فحص الاتصال (Troubleshoot) ▼'}
            </button>
            <button
              onClick={handleToggleConnection}
              disabled={isTogglingConnect}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors ${
                botState.connected
                  ? 'bg-zinc-800 hover:bg-red-950 text-zinc-300 hover:text-red-400 border border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md'
              }`}
            >
              {isTogglingConnect ? 'جاري الاتصال...' : botState.connected ? 'فصل البوت (Disconnect)' : 'إدخال البوت للسيرفر (Connect)'}
            </button>
          </div>
        </div>
      )}

      {/* Expandable Server Diagnostic Wizard */}
      {showWizard && (
        <ServerConnectionWizard onSuccess={() => setShowWizard(false)} />
      )}

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bot Vitals & Connection */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> BOT VITALS
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                botState.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {botState.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Health */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span className="flex items-center gap-1">Health</span>
                <span className="font-bold text-red-400">{botState.health} / 20</span>
              </div>
              <div className="flex items-center gap-0.5">{renderHearts()}</div>
            </div>

            {/* Food */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span className="flex items-center gap-1">Hunger</span>
                <span className="font-bold text-amber-500">{botState.food} / 20</span>
              </div>
              <div className="flex items-center gap-0.5">{renderFood()}</div>
            </div>

            {/* Armor */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span className="flex items-center gap-1">Armor Protection</span>
                <span className="font-bold text-slate-300">{botState.armor} / 20</span>
              </div>
              <div className="flex items-center gap-1">{renderArmor()}</div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-500">{botState.username}</span>
            <button
              onClick={handleToggleConnection}
              disabled={isTogglingConnect}
              className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                botState.connected
                  ? 'bg-zinc-800 hover:bg-red-950/60 text-zinc-300 hover:text-red-400 border border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md'
              }`}
            >
              {isTogglingConnect ? 'Working...' : botState.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Card 2: Coordinates & Navigation */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> NAVIGATION COORDS
            </span>
            <button
              onClick={handleCopyCoords}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
              title="Copy /tp command"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* XYZ Numbers */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center my-2">
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">X</span>
              <span className="text-sm font-bold text-zinc-100">{botState.position.x}</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Y</span>
              <span className="text-sm font-bold text-emerald-400">{botState.position.y}</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Z</span>
              <span className="text-sm font-bold text-zinc-100">{botState.position.z}</span>
            </div>
          </div>

          <div className="space-y-1.5 mt-3 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Heading</span>
              <span className="text-zinc-200">{getCompassHeading(botState.position.yaw)}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Yaw / Pitch</span>
              <span className="text-zinc-200">
                {botState.position.yaw}° / {botState.position.pitch}°
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('controls')}
              className="w-full text-xs font-mono py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-center"
            >
              Open Bot Controls →
            </button>
          </div>
        </div>

        {/* Card 3: World & Environment */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" /> ENVIRONMENT
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 uppercase">
              {botState.dimension.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1 mb-1">
                <TreePine className="w-3 h-3 text-emerald-400" /> Active Biome
              </span>
              <span className="text-xs font-semibold text-zinc-200">{botState.biome}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-zinc-400">Oxygen Level</span>
              <span className="text-cyan-400 font-bold">{botState.oxygen} / 20</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="text-zinc-400">Grounded</span>
              <span className={botState.isGrounded ? 'text-emerald-400' : 'text-amber-400'}>
                {botState.isGrounded ? 'Yes' : 'Airborne'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Server Gateway & TPS */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" /> SERVER GATEWAY
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              {serverInfo.isOnline ? 'Online' : 'Unreachable'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Software</span>
              <span className="text-zinc-200 truncate max-w-[140px]">{serverInfo.version}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>TPS</span>
              <span className="text-emerald-400 font-bold">{serverInfo.tps}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Latency (Ping)</span>
              <span className="text-zinc-200 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400" /> {botState.ping} ms
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Players Online</span>
              <span className="text-cyan-400 font-bold">
                {serverInfo.playersOnline} / {serverInfo.playersMax}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <button
              onClick={() => onNavigateTab('server')}
              className="w-full text-xs font-mono py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-center"
            >
              Server Details & RCON →
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Active Task Card & Quick Action Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Task Card (2 columns wide) */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> ACTIVE AUTONOMOUS TASK
            </span>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-mono text-emerald-400 hover:underline"
            >
              Task Manager →
            </button>
          </div>

          {botState.currentTask ? (
            <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    {botState.currentTask.title}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                      {botState.currentTask.status}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{botState.currentTask.lastAction || 'Processing...'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStopTask}
                    className="p-1.5 rounded bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 text-xs transition-colors flex items-center gap-1"
                    title="Abort Task"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                  <span>Task Execution Progress</span>
                  <span className="text-emerald-400 font-bold">{botState.currentTask.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${botState.currentTask.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800 text-center space-y-2">
              <p className="text-xs text-zinc-400 font-mono">No autonomous task currently running.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    sounds.click();
                    adapter.startTask({
                      title: 'Patrol Base Perimeter',
                      type: 'patrol',
                      targetDetails: 'Radius 25 blocks from origin',
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Start Patrol Task
                </button>
                <button
                  onClick={() => onNavigateTab('ai')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Ask AI Assistant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Commands Deck */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> QUICK COMMANDS
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!m');
                }}
                className="p-2 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-200 transition-colors text-left"
              >
                📜 !menu (الأوامر)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!sh');
                }}
                className="p-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-200 transition-colors text-left"
              >
                🛡️ !shield_me (درع)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!bh');
                }}
                className="p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 transition-colors text-left"
              >
                🏠 !build_house (بناء)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!cm');
                }}
                className="p-2 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-red-200 transition-colors text-left"
              >
                ⚔️ !clear_monsters (وحوش)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!cc');
                }}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
              >
                🧹 !clear_chat (مسح)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!st');
                }}
                className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 transition-colors text-left"
              >
                🛑 !stop (إيقاف)
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  adapter.chat('!bc Helper_Bot');
                }}
                className="p-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-200 transition-colors text-left col-span-2"
              >
                🤖 نشر بوت مساعد (!botc Helper_Bot)
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Control Mode: {mode.toUpperCase()}</span>
            <button onClick={() => onNavigateTab('controls')} className="text-cyan-400 hover:underline">
              Touch/Keypad →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Nearby Players Preview */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> PLAYERS IN RADAR ({players.length})
          </span>
          <button onClick={() => onNavigateTab('players')} className="text-xs font-mono text-cyan-400 hover:underline">
            All Players & Radar →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {players.slice(0, 5).map((player) => (
            <div
              key={player.uuid}
              className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-mono font-bold text-emerald-400 text-xs">
                  {player.username.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-zinc-200 truncate max-w-[90px]">{player.username}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{player.distance}m away</div>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.click();
                  adapter.startTask({
                    title: `Follow ${player.username}`,
                    type: 'follow',
                    targetPlayer: player.username,
                    targetCoords: player.position,
                  });
                }}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono transition-colors"
                title={`Follow ${player.username}`}
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
