import React from 'react';
import { Wrench, ShieldAlert, Lock, RefreshCw } from 'lucide-react';

interface MaintenanceScreenProps {
  message?: string;
  onAdminBypass: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  message,
  onAdminBypass,
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-mono text-xs">
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Wrench className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-zinc-100">BOTCLOUD Under Maintenance</h1>
          <p className="text-zinc-400 text-xs leading-relaxed">
            {message ||
              'We are currently performing scheduled infrastructure upgrades. We will be back online shortly!'}
          </p>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Status: Upgrading Daemons</span>
          <button
            onClick={onAdminBypass}
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Lock className="w-3 h-3" /> Admin Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
