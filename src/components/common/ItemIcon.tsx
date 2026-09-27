import React from 'react';
import { InventorySlot } from '../../types/minecraft';
import { Shield, Sparkles, Sword, Pickaxe, Apple, Flame, Box, CircleDot, Crosshair } from 'lucide-react';

export const ItemIcon: React.FC<{
  item: InventorySlot | null;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}> = ({ item, size = 'md', showCount = true }) => {
  if (!item) {
    return <div className="w-full h-full" />;
  }

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  // Pick color and Lucide icon based on item type
  const renderItemGraphic = () => {
    const name = item.name.toLowerCase();

    if (name.includes('sword')) {
      const color = name.includes('diamond') ? 'text-cyan-400' : name.includes('netherite') ? 'text-indigo-300' : 'text-amber-400';
      return <Sword className={`w-3/5 h-3/5 ${color} drop-shadow-md transform -rotate-45`} />;
    }
    if (name.includes('pickaxe')) {
      const color = name.includes('diamond') ? 'text-cyan-400' : 'text-slate-300';
      return <Pickaxe className={`w-3/5 h-3/5 ${color} drop-shadow-md`} />;
    }
    if (name.includes('helmet') || name.includes('chestplate') || name.includes('leggings') || name.includes('boots')) {
      const color = name.includes('netherite') ? 'text-zinc-400' : 'text-cyan-400';
      return <Shield className={`w-3/5 h-3/5 ${color} drop-shadow-md`} />;
    }
    if (name.includes('apple') || name.includes('beef') || name.includes('bread') || name.includes('food')) {
      const color = name.includes('golden') ? 'text-amber-300' : 'text-red-400';
      return <Apple className={`w-3/5 h-3/5 ${color} drop-shadow-md`} />;
    }
    if (name.includes('pearl') || name.includes('diamond') || name.includes('ingot')) {
      const color = name.includes('ender') ? 'text-emerald-400' : name.includes('diamond') ? 'text-cyan-300' : 'text-amber-300';
      return <Sparkles className={`w-3/5 h-3/5 ${color} drop-shadow-md`} />;
    }
    if (name.includes('torch')) {
      return <Flame className="w-3/5 h-3/5 text-amber-500 drop-shadow-md" />;
    }
    if (name.includes('bow')) {
      return <Crosshair className="w-3/5 h-3/5 text-amber-700 drop-shadow-md" />;
    }
    if (name.includes('arrow')) {
      return <CircleDot className="w-3/5 h-3/5 text-slate-300 drop-shadow-md" />;
    }

    return <Box className="w-3/5 h-3/5 text-zinc-300 drop-shadow-md" />;
  };

  const durabilityPct = item.durability
    ? Math.round((item.durability.current / item.durability.max) * 100)
    : null;

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} select-none group`}>
      {renderItemGraphic()}

      {/* Stack Count */}
      {showCount && item.count > 1 && (
        <span className="absolute bottom-0 right-1 text-xs font-mono font-bold text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
          {item.count}
        </span>
      )}

      {/* Durability Bar */}
      {durabilityPct !== null && (
        <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-black/80 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              durabilityPct > 50 ? 'bg-emerald-500' : durabilityPct > 20 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${durabilityPct}%` }}
          />
        </div>
      )}
    </div>
  );
};
