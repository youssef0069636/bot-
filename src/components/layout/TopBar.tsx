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
  Zap,
  Crown,
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
  onNavigateTab: (tab: any) => void;
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
  onNavigateTab,
}) => {
  const { profile, isAuthenticated, isAdmin, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'BotCloud Ready',
      desc: 'Dedicated Minecraft bot instance is provisioned and ready.',
      time: 'Just now',
      type: 'info',
    },
    {
      id: '2',
      title: 'Multi-Version Gateway',
      desc: 'Supports Minecraft 1.16.5 up to 1.21.1 protocols.',
      time: '5m ago',
      type: 'success',
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 flex items-center justify-between font-mono">
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
        <button
          onClick={() => onNavigateTab('server')}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 text-xs transition-colors"
          title="Click to change server settings"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              serverInfo.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'
            }`}
          />
          <span className="text-zinc-200 hidden sm:inline">{serverInfo.host}</span>
          <span className="text-zinc-500 text-[11px]">: {serverInfo.port}</span>
        </button>

        {/* Bot Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs">
          <Activity
            className={`w-3.5 h-3.5 ${botState.connected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`}
          />
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
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className="text-zinc-500">RUNTIME:</span>
          <span className={mode === 'mock' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
            {mode === 'mock' ? 'DEMO MOCK' : 'LIVE RUNTIME'}
          </span>
        </div>
      </div>

      {/* Right items: Ping, Players, Notifications, Sound, Theme, User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Latency */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>{botState.ping} ms</span>
        </div>

        {/* Upgrade / Plan quick button */}
        <button
          onClick={() => {
            sounds.click();
            onNavigateTab('plans');
          }}
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500/20 to-amber-500/20 hover:from-emerald-500/30 hover:to-amber-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Upgrade Plan
        </button>

        {/* Sound Effects Toggle */}
        <button
          onClick={() => {
            onToggleSound();
            sounds.click();
          }}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                <span className="text-xs font-semibold text-zinc-200 uppercase">System Events</span>
                <span className="text-[10px] text-zinc-500">Live</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{n.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{n.desc}</p>
                    <span className="text-[9px] text-zinc-500 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Auth Button */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
                sounds.click();
              }}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-medium text-zinc-200 leading-none">{profile?.displayName || 'User'}</div>
                <div className="text-[10px] text-emerald-400 capitalize leading-none mt-1">
                  {isAdmin ? 'ADMIN' : 'MEMBER'}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                  <div className="text-xs font-semibold text-zinc-200">{profile?.displayName}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{profile?.email}</div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigateTab('account');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-cyan-400" /> Account Profile
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigateTab('plans');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Zap className="w-4 h-4 text-amber-400" /> Upgrade Plans
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigateTab('admin');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                  >
                    <Shield className="w-4 h-4" /> Super-Admin Center
                  </button>
                )}

                <div className="pt-1 border-t border-zinc-800 mt-1">
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
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow transition-colors"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
};
