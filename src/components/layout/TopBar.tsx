import React, { useState } from 'react';
import {
  Menu,
  Wifi,
  Users,
  Bell,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { BotMode, BotState, ServerInfo } from '../../types/minecraft';
import { sounds } from '../../lib/audio';

interface TopBarProps {
  botState: BotState;
  serverInfo: ServerInfo;
  mode: BotMode;
  onOpenMobileMenu: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light' | 'matrix';
  onToggleTheme: () => void;
  onOpenAuth: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  botState,
  serverInfo,
  mode,
  onOpenMobileMenu,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  onOpenAuth,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: '1', title: 'Bot connected', desc: `Spawned at (${botState.position.x}, ${botState.position.y}, ${botState.position.z})`, time: 'Just now', type: 'info' },
    { id: '2', title: 'Server status stable', desc: 'Running Paper 1.21.1 at 20.0 TPS', time: '2m ago', type: 'success' },
    { id: '3', title: 'Mode active', desc: mode === 'mock' ? 'Running in Simulated Mock Mode' : 'Connected to Remote Persistent Runtime', time: '5m ago', type: 'warn' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 flex items-center justify-between">
      {/* Left items: Mobile toggle & Server/Bot Status Badges */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Server Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs">
          <div className={`w-2 h-2 rounded-full ${serverInfo.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
          <span className="font-mono text-zinc-200 hidden sm:inline">{serverInfo.host}</span>
          <span className="text-zinc-500 font-mono text-[11px]">: {serverInfo.port}</span>
        </div>

        {/* Bot Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-mono">
          <Activity className={`w-3.5 h-3.5 ${botState.connected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
          <span className="text-zinc-300 hidden md:inline">{botState.username}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
              botState.connected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {botState.connected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Mode Tag */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className="text-zinc-500">MODE:</span>
          <span className={mode === 'mock' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
            {mode === 'mock' ? 'DEMO MOCK' : 'LIVE RUNTIME'}
          </span>
        </div>
      </div>

      {/* Right items: Ping, Players, Notifications, Sound, Theme, User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Latency / Ping */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-xs font-mono text-zinc-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>{botState.ping} ms</span>
        </div>

        {/* Player Count */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-xs font-mono text-zinc-300">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{serverInfo.playersOnline} / {serverInfo.playersMax}</span>
        </div>

        {/* Sound Effects Toggle */}
        <button
          onClick={() => {
            onToggleSound();
            sounds.click();
          }}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          title={soundEnabled ? 'Mute Retro UI Sounds' : 'Enable Retro UI Sounds'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            onToggleTheme();
            sounds.click();
          }}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              sounds.click();
            }}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                <span className="text-xs font-semibold text-zinc-200 uppercase font-mono">System Events</span>
                <span className="text-[10px] text-zinc-500 font-mono">3 New</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                      {n.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {n.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      {n.type === 'info' && <Activity className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{n.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{n.desc}</p>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Account Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
              sounds.click();
            }}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-xs transition-colors"
          >
            <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
              {user ? user.username.slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-medium text-zinc-200 leading-none">{user?.username || 'Guest'}</div>
              <div className="text-[10px] text-zinc-400 font-mono capitalize leading-none mt-1">
                {user?.role || 'viewer'}
              </div>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                <div className="text-xs font-semibold text-zinc-200">{user?.displayName || user?.username}</div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3" /> Role: {user?.role.toUpperCase()}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenAuth();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" /> Switch / Login User
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                  sounds.click();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
