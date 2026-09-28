import React, { useState, useEffect } from 'react';
import { Bot, Edit3, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { botManager } from '../../lib/bot/BotManager';
import { sounds } from '../../lib/audio';

interface RenameBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onNameChanged?: (newName: string) => void;
}

export const RenameBotModal: React.FC<RenameBotModalProps> = ({
  isOpen,
  onClose,
  currentName,
  onNameChanged,
}) => {
  const { profile } = useAuth();
  const [newName, setNewName] = useState(currentName);
  const [reconnectNow, setReconnectNow] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isBotConnected = botManager.getAdapter().getState().connected;

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const validateMinecraftUsername = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'اسم البوت لا يمكن أن يكون فارغاً.';
    if (trimmed.length < 3) return 'اسم البوت يجب أن يتكون من 3 أحرف على الأقل.';
    if (trimmed.length > 16) return 'اسم البوت لا يمكن أن يتجاوز 16 حرفاً (قواعد ماينكرافت).';
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'اسم البوت يجب أن يحتوي فقط على حروف إنجليزية، أرقام، أو شرطة سفلية (_) بدون مسافات.';
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) {
      setErrorMsg('يجب تسجيل الدخول أولاً لتعديل اسم البوت.');
      return;
    }

    sounds.click(1.1);
    const validationError = validateMinecraftUsername(newName);
    if (validationError) {
      setErrorMsg(validationError);
      sounds.error();
      return;
    }

    const cleanUsername = newName.trim();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Update Firestore and local settings via botManager.updateBotConfig
      const updateResult = await botManager.updateBotConfig(profile.id, {
        username: cleanUsername,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'فشل في حفظ الاسم الجديد');
      }

      // 3. If bot is connected and reconnectNow is true, disconnect and reconnect with the new name
      if (isBotConnected && reconnectNow) {
        setSuccessMsg('تم حفظ الاسم الجديد! جاري إعادة اتصال البوت بالاسم الجديد...');
        await botManager.getAdapter().disconnect();
        // Wait 2 seconds for server socket release, then connect
        setTimeout(async () => {
          await botManager.connectBot(profile.id);
          sounds.chime();
          if (onNameChanged) {
            onNameChanged(cleanUsername);
          }
          onClose();
        }, 2000);
      } else {
        sounds.chime();
        setSuccessMsg('تم حفظ اسم البوت الجديد بنجاح!');
        if (onNameChanged) {
          onNameChanged(cleanUsername);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ الاسم الجديد.');
      sounds.error();
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 font-mono text-xs space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                تغيير اسم البوت / Change Bot Name
              </h3>
              <p className="text-[10px] text-zinc-400">
                اختر الاسم الذي سيظهر به البوت داخل سيرفر الماينكرافت
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-start gap-2 text-right">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-start gap-2 text-right">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-zinc-300 block mb-1.5 font-bold flex items-center justify-between">
              <span>اسم البوت الجديد (In-Game Nickname)</span>
              <span className="text-[10px] text-zinc-500">3 - 16 حرف</span>
            </label>
            <div className="relative">
              <Edit3 className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                maxLength={16}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value.replace(/\s+/g, '_'));
                  setErrorMsg('');
                }}
                placeholder="e.g. Youssef_Hero"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              ملاحظة: يمكنك استخدام الأحرف الإنجليزية (a-z) والأرقام (0-9) والشرطة السفلية (_).
            </span>
          </div>

          {isBotConnected && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <label htmlFor="reconnectCheck" className="text-zinc-300 text-xs cursor-pointer select-none">
                <span className="font-bold block text-emerald-400">إعادة الاتصال بالاسم الجديد فوراً</span>
                <span className="text-[10px] text-zinc-500">سيتم فصل البوت وإعادة دخوله للسيرفر باسمه الجديد</span>
              </label>
              <input
                id="reconnectCheck"
                type="checkbox"
                checked={reconnectNow}
                onChange={(e) => setReconnectNow(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors"
            >
              إلغاء / Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-1.5 transition-colors shadow-lg"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              حفظ الاسم الجديد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
