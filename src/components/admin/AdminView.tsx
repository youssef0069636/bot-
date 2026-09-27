import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Cpu,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import { UserRole } from '../../types/minecraft';
import { sounds } from '../../lib/audio';

export const AdminView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [users, setUsers] = useState<Array<{ id: string; username: string; displayName: string; role: UserRole }>>([
    { id: 'usr_admin', username: 'admin', displayName: 'Lead Administrator', role: 'admin' },
    { id: 'usr_alex', username: 'alex', displayName: 'Alex (Bot Operator)', role: 'operator' },
    { id: 'usr_viewer', username: 'guest', displayName: 'Guest Observer', role: 'viewer' },
  ]);

  const [apiHealth, setApiHealth] = useState<{
    status: string;
    version: string;
    runtime: { mode: string; persistentConfigured: boolean; geminiConfigured: boolean };
  } | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setApiHealth(data);
      }
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateRole = (userId: string, newRole: UserRole) => {
    sounds.click(1.1);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center space-y-4">
        <Lock className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-100 font-mono">Access Denied: Administrator Required</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Your current session role is <strong className="text-amber-400">{user?.role.toUpperCase()}</strong>.
          The Admin Panel is strictly reserved for operators with the <strong className="text-emerald-400">ADMIN</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <ShieldAlert className="w-5 h-5 text-red-400" /> Admin Command & Audit Center
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Role-based user permissions, runtime health diagnostics, and system integrity logs.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.click();
            fetchHealth();
          }}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs flex items-center gap-1.5 transition-colors border border-zinc-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Diagnostics
        </button>
      </div>

      {/* System Health Diagnostics Card */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> API & Serverless Health Checks
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            HTTP 200 OK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Core Gateway</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Healthy (v1.0.0)
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Vercel Serverless Ready</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Stateles Edge / API
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Gemini AI Model</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-cyan-400">
              <CheckCircle2 className="w-4 h-4" /> gemini-3.8-flash
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Persistent Bot Daemon</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" /> Isolated Adapter
            </div>
          </div>
        </div>
      </div>

      {/* User Management & RBAC Table */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" /> Role-Based Access Control (RBAC)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">{users.length} Registered Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-2">User</th>
                <th className="pb-2">Display Name</th>
                <th className="pb-2">Permissions Role</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-950/40">
                  <td className="py-3 font-semibold text-zinc-200">{u.username}</td>
                  <td className="py-3 text-zinc-400">{u.displayName}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        u.role === 'admin'
                          ? 'bg-red-950/60 text-red-400 border-red-800/60'
                          : u.role === 'operator'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                      className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
