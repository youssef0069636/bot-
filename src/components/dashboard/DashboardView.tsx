import React, { useState, useEffect } from 'react';
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
  Clock,
  Crown,
  AlertTriangle,
  Megaphone,
  Sliders,
  Edit3,
} from 'lucide-react';
import { BotMode, BotState, PlayerInfo, ServerInfo } from '../../types/minecraft';
import { UserSubscription, BotSession, Announcement } from '../../types/saas';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { botManager } from '../../lib/bot/BotManager';
import { useAuth } from '../../lib/auth/authContext';
import { RenameBotModal } from '../common/RenameBotModal';
import {
  getUserSubscription,
  getActiveBotSession,
  startBotSession,
  endBotSession,
  subscribeToUserSubscription,
} from '../../lib/saas/subscriptionService';
import { fetchAnnouncements, subscribeToAnnouncements } from '../../lib/saas/adminService';
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
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [activeSession, setActiveSession] = useState<BotSession | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sessionTimerText, setSessionTimerText] = useState<string>('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const loadSaaSData = async () => {
    if (!profile?.id) return;
    try {
      const botId = `bot_${profile.id}`;
      const [sub, anns, sess] = await Promise.all([
        getUserSubscription(profile.id),
        fetchAnnouncements(),
        getActiveBotSession(profile.id, botId),
      ]);
      setSubscription(sub);
      setAnnouncements(anns.filter((a) => a.active));
      setActiveSession(sess);
    } catch (err) {
      console.warn('Error loading dashboard SaaS data:', err);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    loadSaaSData();

    // 1. Realtime subscription listener
    const unsubSub = subscribeToUserSubscription(profile.id, (sub) => {
      setSubscription(sub);
    });

    // 2. Realtime announcements listener
    const unsubAnns = subscribeToAnnouncements((anns) => {
      setAnnouncements(anns.filter((a) => a.active));
    });

    return () => {
      unsubSub();
      unsubAnns();
    };
  }, [profile?.id]);

  // Live timer interval for Free 24h session / Pro expiration
  useEffect(() => {
    const updateCountdown = () => {
      if (!activeSession) {
        if (subscription?.plan === 'free') {
          setSessionTimerText('Ready to start 24h Free session');
        } else if (subscription?.lifetime) {
          setSessionTimerText('Lifetime Active (Ultra Plan)');
        } else if (subscription?.expiresAt) {
          const diff = new Date(subscription.expiresAt).getTime() - Date.now();
          if (diff <= 0) setSessionTimerText('Pro Plan Expired');
          else {
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            setSessionTimerText(`Pro active: ${d}d ${h}h remaining`);
          }
        }
        return;
      }

      if (activeSession.status === 'expired') {
        setSessionTimerText('24h Session Finished (Click Start to Launch Next 24h Session)');
        return;
      }

      if (activeSession.expiresAt) {
        const remaining = new Date(activeSession.expiresAt).getTime() - Date.now();
        if (remaining <= 0) {
          setSessionTimerText('24h Free Session Expired');
          setActiveSession((prev) => (prev ? { ...prev, status: 'expired' } : null));
          if (botState.connected) {
            adapter.disconnect();
          }
        } else {
          const h = Math.floor(remaining / (1000 * 60 * 60));
          const m = Math.floor((remaining / (1000 * 60)) % 60);
          const s = Math.floor((remaining / 1000) % 60);
          setSessionTimerText(`Session: ${h}h ${m}m ${s}s remaining (24h Limit)`);
        }
      } else {
        setSessionTimerText('Unlimited Session (Ultra Lifetime)');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeSession, subscription, botState.connected]);

  const handleStartBot = async () => {
    if (!profile) return;
    sounds.click(1.2);
    setIsStartingSession(true);

    try {
      const botId = `bot_${profile.id}`;
      const res = await startBotSession(profile.id, botId, 24);

      if (!res.success) {
        alert(res.error || 'Failed to start session.');
        return;
      }

      setActiveSession(res.session || null);
      // Connect bot with latest Firestore config
      await botManager.connectBot(profile.id);
      sounds.chime();
    } catch (err: any) {
      alert(`Start error: ${err?.message || 'Try again'}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleStopBot = async () => {
    sounds.click();
    setIsStartingSession(true);
    try {
      if (activeSession) {
        await endBotSession(activeSession.id, 'user_stopped');
        setActiveSession(null);
      }
      await adapter.disconnect();
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleRestartBot = async () => {
    sounds.click(1.1);
    setIsStartingSession(true);
    try {
      await adapter.restart();
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleCopyCoords = () => {
    sounds.click();
    navigator.clipboard.writeText(
      `/tp ${botState.position.x} ${botState.position.y} ${botState.position.z}`
    );
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleStopTask = async () => {
    sounds.click();
    if (botState.currentTask) {
      await adapter.stopTask(botState.currentTask.id);
    }
  };

  // Calculate compass direction (0=South, 90=West, 180=North, 270=East)
  const getCompassHeading = (yaw = 0): string => {
    const normalized = ((yaw % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'South (+Z)';
    if (normalized >= 22.5 && normalized < 67.5) return 'South-West';
    if (normalized >= 67.5 && normalized < 112.5) return 'West (-X)';
    if (normalized >= 112.5 && normalized < 157.5) return 'North-West';
    if (normalized >= 157.5 && normalized < 202.5) return 'North (-Z)';
    if (normalized >= 202.5 && normalized < 247.5) return 'North-East';
    if (normalized >= 247.5 && normalized < 292.5) return 'East (+X)';
    return 'South-East';
  };

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
      hearts.push(<HeartIcon key={i} type={type} className="w-4 h-4 inline-block" />);
    }
    return hearts;
  };

  const renderFood = () => {
    const hunger = [];
    const food = Math.max(0, Math.min(20, botState.food));
    for (let i = 0; i < 10; i++) {
      const foodValue = (i + 1) * 2;
      let type: 'full' | 'half' | 'empty' = 'empty';
      if (food >= foodValue) {
        type = 'full';
      } else if (food >= foodValue - 1) {
        type = 'half';
      }
      hunger.push(<FoodIcon key={i} type={type} className="w-4 h-4 inline-block" />);
    }
    return hunger;
  };

  return (
    <div className="space-y-6">
      {/* System Announcements Banner */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 font-mono text-xs ${
                ann.type === 'maintenance'
                  ? 'bg-red-950/40 border-red-800 text-red-300'
                  : ann.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              }`}
            >
              <Megaphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold">{ann.title}</strong>: {ann.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Control Banner: Start / Stop / Restart & Subscription Countdown */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Bot & Plan identity */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> BOTCLOUD SAAS
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  subscription?.plan === 'ultra'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : subscription?.plan === 'pro'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {subscription?.plan || 'FREE'} PLAN
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono flex items-center gap-2.5">
                {botState.username}
                <button
                  onClick={() => {
                    sounds.click();
                    setShowRenameModal(true);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 text-xs transition-colors flex items-center gap-1"
                  title="تغيير اسم البوت / Rename Bot"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">تبديل الاسم</span>
                </button>
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase font-mono ${
                  botState.connected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {botState.connected ? '● ONLINE' : '○ OFFLINE'}
              </span>
            </div>

            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">{sessionTimerText}</span>
            </div>
          </div>

          {/* Primary Lifecycle Controls */}
          <div className="flex flex-wrap items-center gap-3 font-mono">
            {!botState.connected ? (
              <button
                onClick={handleStartBot}
                disabled={isStartingSession}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                {isStartingSession ? 'Starting Session...' : 'START BOT (24h FREE)'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleStopBot}
                  disabled={isStartingSession}
                  className="px-5 py-2.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" /> STOP BOT
                </button>
                <button
                  onClick={handleRestartBot}
                  disabled={isStartingSession}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> RESTART
                </button>
              </>
            )}

            <button
              onClick={() => onNavigateTab('server')}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Server className="w-3.5 h-3.5 text-amber-400" /> Switch Server
            </button>
          </div>
        </div>
      </div>

      {/* Top Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bot Vitals */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> BOT VITALS
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              Armor: {botState.armor}/20
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Health</span>
                <span className="text-rose-400 font-bold">{botState.health} / 20</span>
              </div>
              <div className="flex flex-wrap gap-0.5">{renderHearts()}</div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Food (Hunger)</span>
                <span className="text-amber-400 font-bold">{botState.food} / 20</span>
              </div>
              <div className="flex flex-wrap gap-0.5">{renderFood()}</div>
            </div>
          </div>
        </div>

        {/* Card 2: Coordinates & Orientation */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> NAVIGATION
            </span>
            <button
              onClick={handleCopyCoords}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 transition-colors border border-zinc-700"
              title="Copy teleport command"
            >
              {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedCoords ? 'Copied' : 'Copy /tp'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center">
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
              <span>Latency</span>
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
        </div>
      </div>

      {/* Middle Row: Active Task & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Task Card */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> AUTONOMOUS TASK RUNNER
            </span>
            <button onClick={() => onNavigateTab('tasks')} className="text-xs font-mono text-emerald-400 hover:underline">
              Task Deck →
            </button>
          </div>

          {botState.currentTask ? (
            <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    {botState.currentTask.title}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                      {botState.currentTask.status}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{botState.currentTask.lastAction || 'Processing...'}</p>
                </div>

                <button
                  onClick={handleStopTask}
                  className="p-1.5 rounded bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 text-xs transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Execution Progress</span>
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

        {/* Quick Action Commands */}
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
                ⚔️ !clear_monsters
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
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Runtime: {mode.toUpperCase()}</span>
            <button onClick={() => onNavigateTab('controls')} className="text-cyan-400 hover:underline">
              WASD Controls →
            </button>
          </div>
        </div>
      </div>

      {/* Players Radar preview */}
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
              className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
                  {player.username.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-zinc-200 truncate max-w-[90px]">{player.username}</div>
                  <div className="text-[10px] text-zinc-500">{player.distance}m away</div>
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
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] transition-colors"
                title={`Follow ${player.username}`}
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rename Bot Modal */}
      <RenameBotModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        currentName={botState.username}
        onNameChanged={(newName) => {
          loadSaaSData();
        }}
      />
    </div>
  );
};
