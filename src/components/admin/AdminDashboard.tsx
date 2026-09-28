import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Bot,
  CreditCard,
  Megaphone,
  Sliders,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Crown,
  Lock,
  Unlock,
  Wrench,
  RotateCcw,
  Square,
  DollarSign,
  Activity,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/authContext';
import {
  UserProfile,
  UserBot,
  UserSubscription,
  PaymentRecord,
  Announcement,
  SystemConfig,
} from '../../types/saas';
import {
  fetchAllUsers,
  fetchAllBots,
  fetchAllSubscriptions,
  fetchAllPayments,
  fetchAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getSystemSettings,
  updateSystemSettings,
  adminSetUserPlan,
  adminToggleUserSuspension,
  adminRepairBotConfig,
} from '../../lib/saas/adminService';
import { approvePayment, rejectPayment } from '../../lib/saas/paymentService';
import { sounds } from '../../lib/audio';

type AdminTab = 'overview' | 'users' | 'bots' | 'payments' | 'announcements' | 'settings';

export const AdminDashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Data state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bots, setBots] = useState<UserBot[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // Filter/Search
  const [userSearch, setUserSearch] = useState('');
  const [botSearch, setBotSearch] = useState('');

  // Announcement Form
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState<Announcement['type']>('info');

  // Repair Bot Modal State
  const [editingBot, setEditingBot] = useState<UserBot | null>(null);
  const [repairHost, setRepairHost] = useState('');
  const [repairPort, setRepairPort] = useState('25565');
  const [repairVersion, setRepairVersion] = useState('1.20.1');
  const [repairUsername, setRepairUsername] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [u, b, s, p, a, cfg] = await Promise.all([
        fetchAllUsers(),
        fetchAllBots(),
        fetchAllSubscriptions(),
        fetchAllPayments(),
        fetchAnnouncements(),
        getSystemSettings(),
      ]);
      setUsers(u);
      setBots(b);
      setSubscriptions(s);
      setPayments(p);
      setAnnouncements(a);
      setSystemConfig(cfg);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center space-y-4 max-w-lg mx-auto font-mono">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-base font-bold text-zinc-100">Access Denied: Administrator Only</h2>
        <p className="text-xs text-zinc-400">
          This panel is restricted exclusively to the permanent platform administrator.
        </p>
      </div>
    );
  }

  // Derived metrics
  const totalUsers = users.length;
  const freeUsers = subscriptions.filter((s) => s.plan === 'free').length;
  const proUsers = subscriptions.filter((s) => s.plan === 'pro' && s.status === 'active').length;
  const ultraUsers = subscriptions.filter((s) => s.plan === 'ultra').length;
  const onlineBots = bots.filter((b) => b.status === 'online').length;
  const pendingPayments = payments.filter((p) => p.status === 'pending').length;
  const totalRevenueDH = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Payment approval
  const handleApprovePayment = async (paymentId: string) => {
    if (!profile?.email) return;
    sounds.click(1.2);
    const res = await approvePayment(paymentId, profile.email);
    if (res.success) {
      sounds.chime();
      await loadAllAdminData();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!profile?.email) return;
    const reason = prompt('Reason for rejection:', 'Payment proof could not be verified on WhatsApp.') || '';
    sounds.click();
    const res = await rejectPayment(paymentId, profile.email, reason);
    if (res.success) {
      await loadAllAdminData();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  // Plan override
  const handleSetUserPlan = async (userId: string, plan: 'free' | 'pro' | 'ultra') => {
    if (!profile?.email) return;
    sounds.click();
    await adminSetUserPlan(userId, plan, profile.email, 1);
    sounds.chime();
    await loadAllAdminData();
  };

  // User suspension
  const handleToggleUserSuspension = async (userId: string, currentStatus: string) => {
    if (!profile?.email) return;
    sounds.click();
    const isSuspended = currentStatus === 'suspended';
    await adminToggleUserSuspension(userId, !isSuspended, profile.email);
    await loadAllAdminData();
  };

  // Create announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email || !newAnnTitle.trim()) return;
    sounds.click();
    await createAnnouncement(newAnnTitle.trim(), newAnnContent.trim(), newAnnType, profile.email);
    setNewAnnTitle('');
    setNewAnnContent('');
    sounds.chime();
    await loadAllAdminData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!profile?.email) return;
    sounds.click();
    await deleteAnnouncement(id, profile.email);
    await loadAllAdminData();
  };

  // Repair Bot Submit
  const handleSaveRepairBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email || !editingBot) return;
    sounds.click();
    await adminRepairBotConfig(
      editingBot.userId,
      {
        serverHost: repairHost.trim(),
        serverPort: parseInt(repairPort, 10) || 25565,
        minecraftVersion: repairVersion,
        username: repairUsername.trim(),
      },
      profile.email
    );
    sounds.chime();
    setEditingBot(null);
    await loadAllAdminData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              BOTCLOUD Super-Admin Dashboard
              <span className="text-[10px] px-2 py-0.2 rounded bg-red-950 text-red-400 border border-red-800/60">
                MASTER
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Logged in as permanent administrator ({profile?.email})
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.click();
            loadAllAdminData();
          }}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Platform Metrics', icon: Activity },
          { id: 'users', label: `Users (${users.length})`, icon: Users },
          { id: 'bots', label: `Bots (${bots.length})`, icon: Bot },
          { id: 'payments', label: `Payments (${pendingPayments} Pending)`, icon: CreditCard },
          { id: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone },
          { id: 'settings', label: 'System Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.click();
                setActiveTab(tab.id as AdminTab);
              }}
              className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block uppercase">Total Users</span>
              <span className="text-2xl font-bold text-zinc-100 mt-1 block">{totalUsers}</span>
              <span className="text-[10px] text-zinc-400">Registered SaaS Accounts</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block uppercase">Active Subscriptions</span>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {proUsers} Pro | {ultraUsers} Ultra
              </div>
              <span className="text-[10px] text-zinc-400">{freeUsers} Free Users</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block uppercase">Bots Status</span>
              <span className="text-2xl font-bold text-cyan-400 mt-1 block">
                {onlineBots} <span className="text-xs text-zinc-500">/ {bots.length} Online</span>
              </span>
              <span className="text-[10px] text-zinc-400">Live Minecraft Connections</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block uppercase">Total Revenue</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">
                {totalRevenueDH} <span className="text-xs text-zinc-500">DH</span>
              </span>
              <span className="text-[10px] text-zinc-400">{pendingPayments} Pending WhatsApp Proofs</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                  <th className="pb-2">User / Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Current Plan</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {users
                  .filter(
                    (u) =>
                      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => {
                    const sub = subscriptions.find((s) => s.userId === u.id);
                    return (
                      <tr key={u.id} className="text-[11px]">
                        <td className="py-2.5">
                          <div className="font-bold text-zinc-100">{u.displayName || 'No Name'}</div>
                          <div className="text-[10px] text-zinc-400">{u.email}</div>
                        </td>
                        <td className="py-2.5 uppercase font-bold text-zinc-400">{u.role}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub?.plan === 'ultra'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : sub?.plan === 'pro'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {sub?.plan || 'FREE'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                              u.status === 'suspended' ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right space-x-1.5">
                          <button
                            onClick={() => handleSetUserPlan(u.id, 'pro')}
                            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px]"
                            title="Activate Pro (1 Month)"
                          >
                            + Pro
                          </button>
                          <button
                            onClick={() => handleSetUserPlan(u.id, 'ultra')}
                            className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px]"
                            title="Activate Ultra Lifetime"
                          >
                            + Ultra
                          </button>
                          <button
                            onClick={() => handleToggleUserSuspension(u.id, u.status)}
                            className={`px-2 py-1 rounded text-[10px] ${
                              u.status === 'suspended'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {u.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BOTS CONTROL */}
      {activeTab === 'bots' && (
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                  <th className="pb-2">Bot In-Game Name</th>
                  <th className="pb-2">Target Server</th>
                  <th className="pb-2">Version</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {bots.map((b) => (
                  <tr key={b.id} className="text-[11px]">
                    <td className="py-2.5 font-bold text-zinc-100">{b.username}</td>
                    <td className="py-2.5 text-emerald-400">
                      {b.serverHost}:{b.serverPort}
                    </td>
                    <td className="py-2.5 text-zinc-400">{b.minecraftVersion}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          b.status === 'online'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : b.status === 'suspended'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => {
                          setEditingBot(b);
                          setRepairHost(b.serverHost);
                          setRepairPort(String(b.serverPort));
                          setRepairVersion(b.minecraftVersion);
                          setRepairUsername(b.username);
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] flex items-center gap-1 ml-auto"
                      >
                        <Wrench className="w-3 h-3 text-cyan-400" /> Edit / Repair Config
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS APPROVAL */}
      {activeTab === 'payments' && (
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="font-bold text-zinc-200">Manual WhatsApp Payment Verification</h3>
            <span className="text-[10px] text-zinc-400">{pendingPayments} Pending Review</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                  <th className="pb-2">Reference Code</th>
                  <th className="pb-2">User Email</th>
                  <th className="pb-2">WhatsApp / Sender</th>
                  <th className="pb-2">Plan / Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Approval Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {payments.map((p) => (
                  <tr key={p.id} className="text-[11px]">
                    <td className="py-2.5 font-bold text-emerald-400">{p.proofReference || p.id}</td>
                    <td className="py-2.5 text-zinc-300">{p.userEmail}</td>
                    <td className="py-2.5 text-zinc-400">{p.whatsappSender || 'N/A'}</td>
                    <td className="py-2.5 font-bold uppercase">
                      {p.plan} ({p.amount} {p.currency})
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : p.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right space-x-1.5">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprovePayment(p.id)}
                            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px]"
                          >
                            ✓ Approve Plan
                          </button>
                          <button
                            onClick={() => handleRejectPayment(p.id)}
                            className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-[10px]"
                          >
                            ✕ Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Processed by {p.processedBy || 'Admin'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <h3 className="font-bold text-zinc-200 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" /> Broadcast System Announcement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  placeholder="Announcement Title..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <select
                  value={newAnnType}
                  onChange={(e) => setNewAnnType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="update">Update / Feature (Green)</option>
                  <option value="warning">Notice / Warning (Amber)</option>
                  <option value="maintenance">Maintenance (Red)</option>
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              required
              value={newAnnContent}
              onChange={(e) => setNewAnnContent(e.target.value)}
              placeholder="Announcement message content..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Broadcast to All Users
            </button>
          </form>

          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 uppercase">
                      {a.type}
                    </span>
                    {a.title}
                  </div>
                  <p className="text-zinc-400 mt-1 text-[11px]">{a.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(a.id)}
                  className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM SETTINGS */}
      {activeTab === 'settings' && systemConfig && (
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
          <h3 className="font-bold text-zinc-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" /> Platform System Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <div className="font-bold text-zinc-100">Maintenance Mode</div>
                <div className="text-[10px] text-zinc-400">Lock non-admin users with maintenance page</div>
              </div>
              <input
                type="checkbox"
                checked={systemConfig.maintenanceMode}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setSystemConfig({ ...systemConfig, maintenanceMode: val });
                  if (profile?.email) {
                    await updateSystemSettings({ maintenanceMode: val }, profile.email);
                  }
                }}
                className="w-5 h-5 accent-red-500 rounded"
              />
            </div>

            <div>
              <label className="text-zinc-300 block mb-1">WhatsApp Support Number:</label>
              <input
                type="text"
                value={systemConfig.supportWhatsApp}
                onChange={(e) => setSystemConfig({ ...systemConfig, supportWhatsApp: e.target.value })}
                onBlur={async () => {
                  if (profile?.email) {
                    await updateSystemSettings({ supportWhatsApp: systemConfig.supportWhatsApp }, profile.email);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Repair Bot Modal */}
      {editingBot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRepairBot}
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="font-bold text-zinc-100">Repair Bot Configuration</h4>
              <button type="button" onClick={() => setEditingBot(null)} className="text-zinc-500 hover:text-white">
                ✕
              </button>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Bot In-Game Name:</label>
              <input
                type="text"
                required
                value={repairUsername}
                onChange={(e) => setRepairUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Server Host:</label>
              <input
                type="text"
                required
                value={repairHost}
                onChange={(e) => setRepairHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Server Port:</label>
              <input
                type="number"
                required
                value={repairPort}
                onChange={(e) => setRepairPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Minecraft Version:</label>
              <input
                type="text"
                required
                value={repairVersion}
                onChange={(e) => setRepairVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBot(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
              >
                Save Overrides
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
