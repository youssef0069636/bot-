import React, { useState, useEffect } from 'react';
import {
  Zap,
  Crown,
  Sparkles,
  Check,
  Clock,
  MessageCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../lib/auth/authContext';
import { UserSubscription, PaymentRecord, SystemConfig } from '../../types/saas';
import { getUserSubscription } from '../../lib/saas/subscriptionService';
import { createPaymentRequest, getUserPayments } from '../../lib/saas/paymentService';
import { getSystemSettings } from '../../lib/saas/adminService';
import { sounds } from '../../lib/audio';

interface PlansViewProps {
  onPlanActivated?: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ onPlanActivated }) => {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual payment modal state
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'pro' | 'ultra' | null>(null);
  const [whatsappSender, setWhatsappSender] = useState('');
  const [proofRef, setProofRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [sub, config, payHistory] = await Promise.all([
        getUserSubscription(profile.id),
        getSystemSettings(),
        getUserPayments(profile.id),
      ]);
      setSubscription(sub);
      setSystemConfig(config);
      setPayments(payHistory);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (plan: 'pro' | 'ultra') => {
    sounds.click();
    setSelectedPlanToBuy(plan);
    setPaymentSuccessMsg('');
    setProofRef(`INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  };

  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedPlanToBuy) return;

    sounds.click(1.1);
    setIsSubmittingPayment(true);

    try {
      const amount = selectedPlanToBuy === 'pro' ? (systemConfig?.proPriceDH || 40) : (systemConfig?.ultraPriceDH || 79);
      await createPaymentRequest(
        profile.id,
        profile.email,
        selectedPlanToBuy,
        amount,
        proofRef.trim(),
        whatsappSender.trim()
      );

      sounds.chime();
      try {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      setPaymentSuccessMsg(
        'Payment request registered! Please send your proof on WhatsApp. The administrator will approve your plan shortly.'
      );
      await loadData();
    } catch (err: any) {
      alert(`Error submitting payment: ${err?.message || 'Try again'}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const calculateRemainingTime = () => {
    if (!subscription) return null;
    if (subscription.lifetime) return 'LIFETIME ACCESS';
    if (!subscription.expiresAt) return null;

    const diff = new Date(subscription.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'EXPIRED';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h ${minutes}m remaining`;
  };

  const adminWhatsApp = systemConfig?.supportWhatsApp || '+212 600-000000';
  const waUrl = `https://wa.me/${adminWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hello BOTCLOUD Admin, I want to activate the ${selectedPlanToBuy?.toUpperCase()} plan for account: ${profile?.email} (Reference: ${proofRef})`
  )}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-indigo-950/40 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5" /> BOTCLOUD SUBSCRIPTION TIERS
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 font-mono">
              Simple, Transparent Minecraft Bot Plans
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Every plan includes <strong>ONE dedicated Minecraft Bot</strong> with server switching, live controls, web console, and AI actions.
            </p>
          </div>

          {/* Current Plan Badge */}
          {subscription && (
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-right font-mono min-w-[200px]">
              <span className="text-[10px] text-zinc-500 block uppercase">Current Active Tier</span>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                <span
                  className={`text-sm font-bold uppercase px-2 py-0.5 rounded ${
                    subscription.plan === 'ultra'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : subscription.plan === 'pro'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {subscription.plan.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                {calculateRemainingTime() || '24h Renewable Sessions'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Plans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* FREE PLAN */}
        <div
          className={`p-6 rounded-2xl bg-zinc-900/80 border flex flex-col justify-between transition-all ${
            subscription?.plan === 'free'
              ? 'border-zinc-500 ring-1 ring-zinc-500/40 shadow-lg'
              : 'border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold uppercase">
                FREE
              </span>
              <Clock className="w-5 h-5 text-zinc-400" />
            </div>

            <div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-bold text-zinc-100">0 DH</span>
                <span className="text-xs text-zinc-500">/ 24h session</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Unlimited 24-hour sessions. Simply click "Start Bot" whenever a session finishes.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs text-zinc-300 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>1 Dedicated Minecraft Bot</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>24h continuous run per start</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Switch servers anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Full WASD + mobile controls</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Live console & chat logs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Can restart immediately after 24h</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              disabled={subscription?.plan === 'free'}
              className="w-full py-2.5 rounded-xl font-mono text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-default"
            >
              {subscription?.plan === 'free' ? 'Current Plan (Active)' : 'Default Plan'}
            </button>
          </div>
        </div>

        {/* PRO PLAN */}
        <div
          className={`p-6 rounded-2xl bg-gradient-to-b from-emerald-950/20 to-zinc-900 border relative flex flex-col justify-between transition-all ${
            subscription?.plan === 'pro'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
              : 'border-emerald-800/60 hover:border-emerald-600'
          }`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
            POPULAR CHOICE
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase">
                PRO MONTHLY
              </span>
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-bold text-emerald-400">
                  {systemConfig?.proPriceDH || 40} DH
                </span>
                <span className="text-xs text-zinc-400">/ 1 month</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Full 30-day continuous bot execution without 24-hour expiration interruptions.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs text-zinc-200 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Everything in Free plan</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <strong className="text-emerald-300">1 Full Month continuous uptime</strong>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Auto-reconnect on server restart</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Priority AI Gemini Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Direct WhatsApp Operator Support</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleOpenPaymentModal('pro')}
              className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {subscription?.plan === 'pro' ? 'Renew Pro (40 DH)' : 'Upgrade to Pro (40 DH)'}
            </button>
          </div>
        </div>

        {/* ULTRA PLAN */}
        <div
          className={`p-6 rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-900 border relative flex flex-col justify-between transition-all ${
            subscription?.plan === 'ultra'
              ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
              : 'border-amber-800/60 hover:border-amber-600'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase">
                ULTRA LIFETIME
              </span>
              <Crown className="w-5 h-5 text-amber-400" />
            </div>

            <div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-bold text-amber-400">
                  {systemConfig?.ultraPriceDH || 79} DH
                </span>
                <span className="text-xs text-zinc-400">/ One-time lifetime</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Permanent lifetime access to BOTCLOUD service and future platform upgrades.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs text-zinc-200 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <strong className="text-amber-300">Lifetime BotCloud Access</strong>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Zero recurring fees forever</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Priority queue & highest uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>All future bot features & plugins</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>VIP WhatsApp Priority Support</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleOpenPaymentModal('ultra')}
              className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              {subscription?.plan === 'ultra' ? 'Ultra Active (Lifetime)' : 'Get Ultra Lifetime (79 DH)'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual WhatsApp Payment Modal */}
      {selectedPlanToBuy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 font-mono space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-zinc-100 text-base">
                  Activate {selectedPlanToBuy.toUpperCase()} via WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanToBuy(null)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 space-y-3">
                <div className="font-bold text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> {paymentSuccessMsg}
                </div>
                <p className="text-xs text-zinc-300">
                  Your reference invoice code is: <strong className="text-emerald-400 font-bold">{proofRef}</strong>
                </p>
                <div className="pt-2 flex gap-3">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> Open WhatsApp Now
                  </a>
                  <button
                    onClick={() => setSelectedPlanToBuy(null)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitPaymentProof} className="space-y-4 text-xs">
                {/* Instruction step */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-zinc-300">
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    How manual WhatsApp payment works:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                    <li>
                      Amount to pay: <strong className="text-emerald-400">
                        {selectedPlanToBuy === 'pro' ? '40 DH' : '79 DH'}
                      </strong>
                    </li>
                    <li>
                      Send payment (CIH Bank / CashPlus / Attijariwafa / Wafacash) or contact administrator on WhatsApp:{' '}
                      <span className="text-emerald-400 font-bold">{adminWhatsApp}</span>
                    </li>
                    <li>Submit the form below and send receipt on WhatsApp for instant activation.</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Your WhatsApp Number (or Name):</label>
                    <input
                      type="text"
                      required
                      value={whatsappSender}
                      onChange={(e) => setWhatsappSender(e.target.value)}
                      placeholder="e.g. +212 612-345678 or Youssef"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Invoice Reference ID:</label>
                    <input
                      type="text"
                      readOnly
                      value={proofRef}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-emerald-400 font-bold outline-none cursor-text"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> WhatsApp Admin
                  </a>

                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-2"
                  >
                    {isSubmittingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Confirm & Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment History Table if any */}
      {payments.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 font-mono text-xs space-y-3">
          <h3 className="font-bold text-zinc-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Your Payment History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {payments.map((p) => (
                  <tr key={p.id} className="text-[11px]">
                    <td className="py-2.5 font-bold text-zinc-200">{p.proofReference || p.id}</td>
                    <td className="py-2.5 uppercase text-emerald-400">{p.plan}</td>
                    <td className="py-2.5">{p.amount} {p.currency}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : p.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
