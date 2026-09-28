import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/auth/authContext';
import { botManager } from './lib/bot/BotManager';
import { BotInventory, BotState, ChatMessage, LogEntry, PlayerInfo, ServerInfo } from './types/minecraft';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { BotControlView } from './components/controls/BotControlView';
import { ConsoleView } from './components/console/ConsoleView';
import { ChatView } from './components/chat/ChatView';
import { AIAssistantView } from './components/ai/AIAssistantView';
import { InventoryView } from './components/inventory/InventoryView';
import { PlayersView } from './components/players/PlayersView';
import { ServerView } from './components/server/ServerView';
import { TasksView } from './components/tasks/TasksView';
import { PlansView } from './components/plans/PlansView';
import { AccountView } from './components/account/AccountView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { getSystemSettings } from './lib/saas/adminService';
import { sounds } from './lib/audio';

function MainApp() {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Maintenance mode
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  const [settings, setSettings] = useState(() => botManager.getSettings());
  const [botState, setBotState] = useState<BotState>(() => botManager.getAdapter().getState());
  const [inventory, setInventory] = useState<BotInventory>(() => botManager.getAdapter().getInventory());
  const [players, setPlayers] = useState<PlayerInfo[]>(() => botManager.getAdapter().getPlayers());
  const [serverInfo, setServerInfo] = useState<ServerInfo>(() => botManager.getAdapter().getServerInfo());
  const [logs, setLogs] = useState<LogEntry[]>(() => botManager.getAdapter().getLogs(150));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => botManager.getAdapter().getChat(100));

  // Sync active user ID with BotManager
  useEffect(() => {
    if (profile?.id) {
      botManager.setActiveUserId(profile.id);
      botManager.syncBotConfigFromFirestore(profile.id);
    } else {
      botManager.setActiveUserId(null);
    }
  }, [profile?.id]);

  // Check Maintenance Mode
  useEffect(() => {
    getSystemSettings().then((cfg) => {
      if (cfg.maintenanceMode && !isAdmin) {
        setIsMaintenance(true);
        setMaintenanceMsg(cfg.maintenanceMessage);
      } else {
        setIsMaintenance(false);
      }
    });
  }, [isAdmin]);

  // Sync settings and state with BotManager
  useEffect(() => {
    const unsubSettings = botManager.onSettingsChange((newSettings) => {
      setSettings(newSettings);
      sounds.enabled = newSettings.soundEffects;
    });

    const unsubState = botManager.subscribeState((newState) => {
      setBotState(newState);
      const adapter = botManager.getAdapter();
      setInventory(adapter.getInventory());
      setPlayers(adapter.getPlayers());
      setServerInfo(adapter.getServerInfo());
    });

    const adapter = botManager.getAdapter();
    const unsubLog = adapter.onLog((log) => {
      setLogs((prev) => [log, ...prev.slice(0, 300)]);
    });

    const unsubChat = adapter.onChat((chat) => {
      setChatMessages((prev) => [...prev, chat]);
    });

    return () => {
      unsubSettings();
      unsubState();
      unsubLog();
      unsubChat();
    };
  }, [settings.activeMode]);

  const handleToggleSound = useCallback(() => {
    const nextVal = !settings.soundEffects;
    botManager.updateSettings({ soundEffects: nextVal });
    sounds.enabled = nextVal;
  }, [settings.soundEffects]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    botManager.updateSettings({ theme: nextTheme });
  }, [settings.theme]);

  const adapter = botManager.getAdapter();

  if (isMaintenance && !isAdmin) {
    return (
      <>
        <MaintenanceScreen
          message={maintenanceMsg}
          onAdminBypass={() => setAuthModalOpen(true)}
        />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        settings.theme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-black text-zinc-100'
      } selection:bg-emerald-500 selection:text-black font-sans flex`}
    >
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botStatus={botState.status}
        mode={settings.activeMode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopBar
          botState={botState}
          serverInfo={serverInfo}
          mode={settings.activeMode}
          onOpenMobileMenu={() => setMobileOpen(true)}
          soundEnabled={settings.soundEffects}
          onToggleSound={handleToggleSound}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onOpenAuth={() => setAuthModalOpen(true)}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* View Router */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              botState={botState}
              serverInfo={serverInfo}
              players={players}
              adapter={adapter}
              mode={settings.activeMode}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'controls' && (
            <BotControlView
              botState={botState}
              inventory={inventory}
              adapter={adapter}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'console' && (
            <ConsoleView logs={logs} adapter={adapter} />
          )}

          {activeTab === 'chat' && (
            <ChatView
              chatMessages={chatMessages}
              adapter={adapter}
              botUsername={botState.username}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistantView
              botState={botState}
              players={players}
              adapter={adapter}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              botState={botState}
              adapter={adapter}
            />
          )}

          {activeTab === 'players' && (
            <PlayersView
              players={players}
              botState={botState}
              adapter={adapter}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              botState={botState}
              players={players}
              adapter={adapter}
            />
          )}

          {activeTab === 'server' && (
            <ServerView
              serverInfo={serverInfo}
              onRefresh={() => {
                setServerInfo(adapter.getServerInfo());
              }}
            />
          )}

          {activeTab === 'plans' && (
            <PlansView
              onPlanActivated={() => {
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'account' && (
            <AccountView
              onNavigatePlans={() => {
                setActiveTab('plans');
              }}
            />
          )}

          {activeTab === 'admin' && <AdminDashboard />}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
