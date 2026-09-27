import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Key,
  Globe,
  Radio,
  Volume2,
  CheckCircle2,
  Save,
  AlertCircle,
  Cpu,
  Sparkles,
  Link,
  ShieldAlert,
} from 'lucide-react';
import { botManager } from '../../lib/bot/BotManager';
import { AppSettings, BotMode } from '../../types/minecraft';
import { ServerConnectionWizard } from '../common/ServerConnectionWizard';
import { sounds } from '../../lib/audio';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isTestingRuntime, setIsTestingRuntime] = useState(false);
  const [runtimeTestStatus, setRuntimeTestStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: keyof AppSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.click(1.2);
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestRuntime = async () => {
    if (!formData.remoteRuntimeUrl) {
      setRuntimeTestStatus({
        success: false,
        message: 'Please enter a persistent runtime URL first.',
      });
      return;
    }

    sounds.click();
    setIsTestingRuntime(true);
    setRuntimeTestStatus(null);

    try {
      const cleanUrl = formData.remoteRuntimeUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/health`, {
        headers: formData.remoteApiKey
          ? { Authorization: `Bearer ${formData.remoteApiKey}` }
          : {},
      });

      if (res.ok) {
        const data = await res.json();
        setRuntimeTestStatus({
          success: true,
          message: `Connected successfully! Daemon: ${data.daemon || 'Active'}, Target: ${data.targetServer || 'Ready'}`,
        });
      } else {
        setRuntimeTestStatus({
          success: false,
          message: `Endpoint responded with status ${res.status} (${res.statusText})`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setRuntimeTestStatus({
        success: false,
        message: `Failed to reach runtime at ${formData.remoteRuntimeUrl}. Make sure your standalone daemon is running. (${msg})`,
      });
    } finally {
      setIsTestingRuntime(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <SettingsIcon className="w-5 h-5 text-emerald-400" /> Control Deck Configuration
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure bot identifiers, Minecraft server parameters, and persistent daemon endpoints.
          </p>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Settings Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Grid: 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Minecraft Connection Details */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            <Server className="w-4 h-4 text-emerald-400" /> Minecraft Server Parameters
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Bot Username</label>
              <input
                type="text"
                value={formData.botUsername}
                onChange={(e) => handleChange('botUsername', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1">Minecraft Host</label>
                <input
                  type="text"
                  value={formData.serverHost}
                  onChange={(e) => handleChange('serverHost', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Port</label>
                <input
                  type="number"
                  value={formData.serverPort}
                  onChange={(e) => handleChange('serverPort', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 mb-1">Minecraft Version</label>
                <select
                  value={formData.minecraftVersion}
                  onChange={(e) => handleChange('minecraftVersion', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                >
                  <option value="1.21.1">1.21.1 (Latest)</option>
                  <option value="1.20.4">1.20.4</option>
                  <option value="1.20.2">1.20.2</option>
                  <option value="1.19.4">1.19.4</option>
                  <option value="1.18.2">1.18.2</option>
                  <option value="1.16.5">1.16.5</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Command Prefix</label>
                <input
                  type="text"
                  value={formData.commandPrefix}
                  onChange={(e) => handleChange('commandPrefix', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Persistent Mineflayer Runtime Endpoint */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Persistent Runtime Architecture
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Vercel Decoupled
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Active Operating Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('activeMode', 'mock')}
                  className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                    formData.activeMode === 'mock'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Demo / Mock Mode
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('activeMode', 'remote')}
                  className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                    formData.activeMode === 'remote'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Live Bot Daemon
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Persistent Daemon URL</label>
              <input
                type="text"
                placeholder="http://localhost:4000 or https://your-daemon.up.railway.app"
                value={formData.remoteRuntimeUrl}
                onChange={(e) => handleChange('remoteRuntimeUrl', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Bearer API Key (Daemon Secret)</label>
              <input
                type="password"
                placeholder="Secret key configured on daemon"
                value={formData.remoteApiKey}
                onChange={(e) => handleChange('remoteApiKey', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Test button & feedback */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestRuntime}
                disabled={isTestingRuntime}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <Link className="w-3.5 h-3.5" /> {isTestingRuntime ? 'Pinging Daemon...' : 'Test Runtime Connection'}
              </button>

              {runtimeTestStatus && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs font-mono flex items-start gap-2 ${
                    runtimeTestStatus.success
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                      : 'bg-red-950/40 text-red-300 border border-red-800/60'
                  }`}
                >
                  {runtimeTestStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{runtimeTestStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Dashboard Experience & Audio */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            <Volume2 className="w-4 h-4 text-amber-400" /> UI Sound Effects & Reconnect Settings
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:bg-zinc-900">
              <input
                type="checkbox"
                checked={formData.soundEffects}
                onChange={(e) => handleChange('soundEffects', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              <div>
                <div className="font-semibold text-zinc-200">Retro Minecraft Audio</div>
                <div className="text-[11px] text-zinc-500">Procedural click, attack, and pop sounds</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:bg-zinc-900">
              <input
                type="checkbox"
                checked={formData.autoReconnect}
                onChange={(e) => handleChange('autoReconnect', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              <div>
                <div className="font-semibold text-zinc-200">Auto Reconnect</div>
                <div className="text-[11px] text-zinc-500">Attempt rejoin on unexpected kick</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:bg-zinc-900">
              <input
                type="checkbox"
                checked={formData.notificationsEnabled}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
              />
              <div>
                <div className="font-semibold text-zinc-200">In-App Alerts</div>
                <div className="text-[11px] text-zinc-500">Banner events for bot vitals & tasks</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Real Server Diagnostic & Connection Tool */}
      <ServerConnectionWizard />
    </form>
  );
};
