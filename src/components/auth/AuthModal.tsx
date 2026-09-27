import React, { useState } from 'react';
import {
  Lock,
  User,
  Shield,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { sounds } from '../../lib/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, user } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    sounds.click(1.1);

    try {
      if (isRegisterMode) {
        const res = await register(username, password, displayName);
        if (res.success) {
          sounds.chime();
          onClose();
        } else {
          setError(res.error || 'Registration failed');
        }
      } else {
        const res = await login(username, password);
        if (res.success) {
          sounds.chime();
          onClose();
        } else {
          setError(res.error || 'Login failed');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (usr: string, pass: string) => {
    sounds.click();
    setLoading(true);
    setError(null);
    try {
      const res = await login(usr, pass);
      if (res.success) {
        sounds.chime();
        onClose();
      } else {
        setError(res.error || 'Quick login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-mono">
                {isRegisterMode ? 'Register Operator Account' : 'Authenticate Session'}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">Minecraft Control Center Gateway</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.click();
              onClose();
            }}
            className="p-1 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current user info */}
        {user && (
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono flex items-center justify-between">
            <span className="text-zinc-400">Active session:</span>
            <span className="text-emerald-400 font-bold">
              {user.username} ({user.role.toUpperCase()})
            </span>
          </div>
        )}

        {/* Quick Demo Credentials */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">1-Click Fast Switch:</span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'minecraft123')}
              className="py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left transition-colors"
            >
              <span className="font-bold text-emerald-400 block">Lead Admin</span>
              <span className="text-[10px] text-zinc-500">Full Permissions</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('alex', 'steve123')}
              className="py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left transition-colors"
            >
              <span className="font-bold text-cyan-400 block">Alex (Operator)</span>
              <span className="text-[10px] text-zinc-500">Bot Controls</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {isRegisterMode && (
            <div>
              <label className="block text-zinc-400 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Server Commander"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-[11px] text-zinc-400 hover:text-emerald-400 underline"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
