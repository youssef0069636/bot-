import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wifi,
  ExternalLink,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import { botManager } from '../../lib/bot/BotManager';
import { sounds } from '../../lib/audio';
import { pingMinecraftServer } from '../../lib/server/pingService';

interface ServerConnectionWizardProps {
  onSuccess?: () => void;
}

export const ServerConnectionWizard: React.FC<ServerConnectionWizardProps> = ({ onSuccess }) => {
  const settings = botManager.getSettings();
  const [host, setHost] = useState(settings.serverHost);
  const [port, setPort] = useState(String(settings.serverPort));
  const [username, setUsername] = useState(settings.botUsername);
  const [version, setVersion] = useState(settings.minecraftVersion);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    online: boolean;
    latency?: number;
    message: string;
    code?: string;
  } | null>(null);

  const handleTestPing = async () => {
    sounds.click();
    setIsTesting(true);
    setTestResult(null);

    try {
      const data = await pingMinecraftServer(host.trim(), parseInt(port, 10) || 25565);

      if (data.online) {
        sounds.chime();
        setTestResult({
          tested: true,
          online: true,
          latency: data.latency,
          message: data.message || `السيرفر متصل والمنفذ مفتوح بنجاح (${data.latency ?? 45}ms)!`,
        });
      } else {
        sounds.error();
        setTestResult({
          tested: true,
          online: false,
          code: data.code,
          message: data.message || 'تعذر الوصول إلى السيرفر. تأكد من تشغيل السيرفر ومن صحة العنوان ورقم المنفذ.',
        });
      }
    } catch (err: unknown) {
      sounds.error();
      const msg = err instanceof Error ? err.message : 'Error';
      setTestResult({
        tested: true,
        online: false,
        message: `فشل فحص الاتصال: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyAndConnect = async () => {
    let cleanHost = host.trim();
    let cleanPort = parseInt(port, 10) || 25565;
    if (cleanHost.includes(':')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0].trim();
      cleanPort = parseInt(parts[1], 10) || cleanPort;
      setHost(cleanHost);
      setPort(String(cleanPort));
    }

    sounds.click(1.2);
    botManager.updateSettings({
      serverHost: cleanHost,
      serverPort: cleanPort,
      botUsername: username.trim() || 'ControlDeckBot',
      minecraftVersion: version,
      activeMode: 'remote',
    });

    const success = await botManager.connectBot();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-sm">
            أداة فحص وحل مشاكل الاتصال بالسيرفر (Server Connection Diagnostics)
          </h3>
        </div>
        <span className="text-[10px] text-zinc-500 uppercase">Live Mineflayer TCP</span>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <div className="sm:col-span-2">
          <label className="text-[11px] text-zinc-400 block mb-1">
            عنوان السيرفر (Server IP / Host):
          </label>
          <input
            type="text"
            placeholder="مثال: jeuxapk6.aternos.me"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">المنفذ (Port):</label>
          <input
            type="number"
            placeholder="63257"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">اسم البوت (Username):</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">إصدار السيرفر:</label>
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="1.21.1">1.21.1 (سيرفر أترنوس)</option>
            <option value="1.20.4">1.20.4</option>
            <option value="1.20.2">1.20.2</option>
            <option value="1.20.1">1.20.1</option>
            <option value="1.19.4">1.19.4</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleTestPing}
          disabled={isTesting || !host}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700 disabled:opacity-50"
        >
          <Wifi className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
          {isTesting ? 'جاري فحص السيرفر...' : '1. فحص اتصال السيرفر (Ping Test)'}
        </button>

        <button
          type="button"
          onClick={handleApplyAndConnect}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          2. حفظ وإدخال البوت للسيرفر الآن
        </button>
      </div>

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 ${
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
            <div className="font-bold">
              {testResult.online ? 'السيرفر متصل ويعمل بنجاح!' : 'فشل الاتصال بالسيرفر!'}
            </div>
            <div className="text-[11px] mt-0.5 text-zinc-300">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Common Pitfalls Checklist for Minecraft Bots */}
      <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-2 text-[11px]">
        <div className="font-bold text-amber-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" /> لماذا قد لا يدخل البوت؟ (أسباب شائعة وحلولها):
        </div>

        <ul className="space-y-1.5 text-zinc-300 list-disc list-inside">
          <li>
            <strong className="text-zinc-100">سيرفرات أترنوس (Aternos):</strong> لكل سيرفر في أترنوس منفذ خاص متغيّر (Dynamic IP). عند تشغيل السيرفر في موقع أترنوس، انظر تحت زر Connect وانسخ العنوان والـ Port بالضبط (مثال: <code className="text-emerald-400">myserver.aternos.me</code> والمنفذ <code className="text-emerald-400">38291</code> وليس 25565 الافتراضي).
          </li>
          <li>
            <strong className="text-zinc-100">السيرفر مغلق (Server Offline):</strong> سيرفرات أترنوس وFalixNodes تنطفئ تلقائياً إذا لم يكن هناك لاعب. تأكد من الضغط على <strong>START</strong> في لوحة تحكم السيرفر وانتظار اكتمال التشغيل (Online).
          </li>
          <li>
            <strong className="text-zinc-100">خاصية السيرفر المكرك (Cracked):</strong> البوت يدخل بحساب غير مدفوع (Offline Mode). يجب تفعيل خيار <strong className="text-amber-300">Cracked (مكرك)</strong> في خيارات/إعدادات السيرفر أو ضبط <code className="text-cyan-300">online-mode=false</code> في ملف server.properties.
          </li>
          <li>
            <strong className="text-zinc-100">القائمة البيضاء (Whitelist):</strong> إذا كانت القائمة البيضاء مفعلة، اكتب في كونسول السيرفر: <code className="text-emerald-400">/whitelist add {username || 'ControlDeckBot'}</code>.
          </li>
          <li>
            <strong className="text-zinc-100">إصدار ماينكرافت (Version):</strong> تأكد أن إصدار السيرفر يتوافق مع الإصدار المختار (1.21.1 أو 1.20.4).
          </li>
        </ul>
      </div>
    </div>
  );
};
