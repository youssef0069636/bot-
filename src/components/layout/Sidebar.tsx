import React from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Terminal,
  MessageSquare,
  Bot,
  Package,
  Users,
  Server,
  ListTodo,
  ShieldAlert,
  Radio,
  Cpu,
  X,
  CreditCard,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { botManager } from '../../lib/bot/BotManager';
import { BotMode, BotStatus } from '../../types/minecraft';
import { sounds } from '../../lib/audio';

export type ActiveTab =
  | 'dashboard'
  | 'controls'
  | 'console'
  | 'chat'
  | 'ai'
  | 'inventory'
  | 'players'
  | 'server'
  | 'tasks'
  | 'plans'
  | 'account'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  botStatus: BotStatus;
  mode: BotMode;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  botStatus,
  mode,
  mobileOpen,
  setMobileOpen,
}) => {
  const { isAdmin } = useAuth();

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'controls', label: 'Bot Controls', icon: Gamepad2 },
    { id: 'console', label: 'Live Console', icon: Terminal },
    { id: 'chat', label: 'Chat & Aliases', icon: MessageSquare },
    { id: 'ai', label: 'AI Planner', icon: Bot, badge: 'Gemini' },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'players', label: 'Radar & Players', icon: Users },
    { id: 'tasks', label: 'Tasks & Auto', icon: ListTodo },
    { id: 'server', label: 'Server Setup', icon: Server },
    { id: 'plans', label: 'Plans & Upgrade', icon: CreditCard, badge: 'VIP' },
    { id: 'account', label: 'Account Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Center', icon: ShieldAlert, badge: 'Admin' });
  }

  const handleSelectTab = (id: ActiveTab) => {
    sounds.click(1.1);
    setActiveTab(id);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleToggleMode = () => {
    sounds.click(0.9);
    const newMode: BotMode = mode === 'mock' ? 'remote' : 'mock';
    botManager.setMode(newMode);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-950/95 border-r border-zinc-800/80 backdrop-blur-md flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-zinc-100 flex items-center gap-1.5 font-mono">
                BOTCLOUD <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-800/50">SaaS</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono">Minecraft Autonomous Deck</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Runtime Mode Selector */}
        <div className="p-3">
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Radio
                  className={`w-3 h-3 ${
                    mode === 'mock' ? 'text-amber-400 animate-pulse' : 'text-emerald-400 animate-pulse'
                  }`}
                />
                {mode === 'mock' ? 'DEMO MOCK' : 'LIVE RUNTIME'}
              </span>
              <button
                onClick={handleToggleMode}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                title="Switch between Live Mineflayer Backend and Demo Simulation"
              >
                Switch
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 leading-snug">
              {mode === 'mock'
                ? 'Simulated environment without live server connection.'
                : 'Connected to live Mineflayer bot backend.'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2.5 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Bot Status */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 font-mono">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  botStatus === 'online'
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : botStatus === 'connecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-red-500'
                }`}
              />
              <span className="capitalize text-[11px] text-zinc-300">Bot {botStatus}</span>
            </div>
            <span className="text-[10px] text-zinc-500">1 Bot Active</span>
          </div>
        </div>
      </aside>
    </>
  );
};
