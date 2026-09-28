import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Clock,
  KeyRound,
  Bot,
  Server,
  LogOut,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Crown,
  Zap,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { UserSubscription, UserBot } from '../../types/saas';
import { getUserSubscription } from '../../lib/saas/subscriptionService';
import { getOrCreateUserBot } from '../../lib/saas/botService';
import { botManager } from '../../lib/bot/BotManager';
import { RenameBotModal } from '../common/RenameBotModal';
import { sounds } from '../../lib/audio';

interface AccountViewProps {
  onNavigatePlans: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigatePlans }) => {
  const { profile, firebaseUser, resetPassword, logout } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [bot, setBot] = useState<UserBot | null>(null);
  const [resetMsg, setResetMsg] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = () => {
    if (!profile?.id) return;
    getUserSubscription(profile.id).then(setSubscription);
    getOrCreateUserBot(profile.id, profile.email, profile.displayName).then((userBot) => {
      setBot(userBot);
      if (userBot?.username) {
        setNewUsernameInput(userBot.username);
      }
    });
  };

  const handleUpdateBotUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile?.id) return;

    sounds.click(1.1);
    setIsUpdatingUsername(true);
    setUpdateFeedback(null);

    try {
      const res = await botManager.updateBotConfig(profile.id, {
        username: newUsernameInput,
      });

      if (res.success && res.bot) {
        setBot(res.bot);
        setNewUsernameInput(res.bot.username);
        setUpdateFeedback({
          type: 'success',
          message: `Bot username successfully updated to "${res.bot.username}" in Firestore!`,
        });
        sounds.chime();
      } else {
        setUpdateFeedback({
          type: 'error',
          message: res.error || 'Failed to update bot username in Firestore.',
        });
        sounds.error();
      }
    } catch (err: any) {
      setUpdateFeedback({
        type: 'error',
        message: err?.message || 'Unexpected error occurred while updating bot config.',
      });
      sounds.error();
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!profile?.email) return;
    sounds.click();
    setIsSendingReset(true);
    setResetMsg('');
    try {
      const res = await resetPassword(profile.email);
      if (res.success) {
        setResetMsg('Password reset email sent! Check your inbox.');
      } else {
        setResetMsg(`Error: ${res.error}`);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
      {/* Account Header */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-lg">
            {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100">{profile?.displayName || 'BotCloud User'}</h1>
            <p className="text-zinc-400 text-[11px]">{profile?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
              profile?.role === 'admin'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            Role: {profile?.role.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Subscription Info Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="font-bold text-zinc-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Subscription Plan
            </span>
            <button
              onClick={onNavigatePlans}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              Upgrade / Manage <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Current Tier</span>
              <span className="font-bold text-emerald-400 uppercase">{subscription?.plan || 'FREE'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Status</span>
              <span className="text-zinc-200 capitalize">{subscription?.status || 'Active'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Duration</span>
              <span className="text-zinc-200">
                {subscription?.lifetime
                  ? 'Lifetime Access'
                  : subscription?.plan === 'pro'
                  ? '1 Month'
                  : '24h Renewable Sessions'}
              </span>
            </div>
            {subscription?.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Expires At</span>
                <span className="text-zinc-300">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Bot Overview Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="font-bold text-zinc-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" /> Assigned Minecraft Bot
            </span>
            <span className="text-[10px] text-zinc-500 uppercase">1 User = 1 Bot</span>
          </div>

          {/* Direct Bot Username Input Field and Update Button */}
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="botUsernameInput" className="font-bold text-zinc-300 flex items-center gap-1.5 text-xs">
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Update Bot Username / اسم البوت</span>
              </label>
              <span className="text-[10px] text-zinc-500">3-16 chars (letters, digits, _)</span>
            </div>

            <form onSubmit={handleUpdateBotUsername} className="flex items-center gap-2">
              <input
                id="botUsernameInput"
                type="text"
                required
                maxLength={16}
                value={newUsernameInput}
                onChange={(e) => {
                  setNewUsernameInput(e.target.value.replace(/\s+/g, '_'));
                  setUpdateFeedback(null);
                }}
                placeholder="Enter new bot username..."
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-emerald-400 font-bold text-xs outline-none focus:border-emerald-500 placeholder:text-zinc-600 transition-colors"
              />
              <button
                type="submit"
                disabled={isUpdatingUsername || !newUsernameInput.trim() || newUsernameInput === bot?.username}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold flex items-center gap-1.5 transition-colors shadow-md text-xs flex-shrink-0"
              >
                {isUpdatingUsername ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Update
              </button>
            </form>

            {updateFeedback && (
              <div
                className={`p-2.5 rounded-lg flex items-center gap-2 text-[11px] ${
                  updateFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/60 text-red-300'
                }`}
              >
                {updateFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                )}
                <span className="flex-1">{updateFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Current In-Game Name</span>
              <span className="font-bold text-emerald-400">{bot?.username || 'Youssef_Bot'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Target Server</span>
              <span className="text-emerald-400">{bot?.serverHost}:{bot?.serverPort}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Minecraft Version</span>
              <span className="text-zinc-200">{bot?.minecraftVersion || '1.20.1'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Status</span>
              <span className="text-zinc-300 capitalize">{bot?.status || 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Reset Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h3 className="font-bold text-zinc-200 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-400" /> Security & Session
        </h3>

        {resetMsg && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-300">
            {resetMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleSendPasswordReset}
            disabled={isSendingReset}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center gap-2 border border-zinc-700 transition-colors"
          >
            {isSendingReset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 text-amber-400" />}
            Send Password Reset Link
          </button>

          <button
            onClick={() => {
              sounds.click();
              logout();
            }}
            className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold flex items-center gap-2 border border-red-800/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out of BotCloud
          </button>
        </div>
      </div>

      {/* Rename Bot Modal */}
      <RenameBotModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        currentName={bot?.username || 'Youssef_Bot'}
        onNameChanged={(newName) => {
          loadData();
        }}
      />
    </div>
  );
};
