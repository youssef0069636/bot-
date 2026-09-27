import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sword,
  Hand,
  Trash2,
  Repeat,
  Package,
  Crosshair,
  Footprints,
  Compass,
} from 'lucide-react';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { BotInventory, BotState } from '../../types/minecraft';
import { ItemIcon } from '../common/ItemIcon';
import { sounds } from '../../lib/audio';

interface BotControlViewProps {
  botState: BotState;
  inventory: BotInventory;
  adapter: BotAdapter;
  onNavigateTab: (tab: 'inventory' | 'chat') => void;
}

export const BotControlView: React.FC<BotControlViewProps> = ({
  botState,
  inventory,
  adapter,
  onNavigateTab,
}) => {
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});
  const [attackAnimation, setAttackAnimation] = useState(false);
  const [lastActionText, setLastActionText] = useState('Standby');

  // Keybindings listener for Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' ', 'shift', 'control', 'q', 'e', 'f', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        e.preventDefault();
      }

      if (pressedKeys[key]) return; // prevent key repeat floods

      setPressedKeys((prev) => ({ ...prev, [key]: true }));

      if (key === 'w') adapter.move('forward', true);
      if (key === 's') adapter.move('back', true);
      if (key === 'a') adapter.move('left', true);
      if (key === 'd') adapter.move('right', true);
      if (key === ' ') {
        sounds.click(1.2);
        adapter.jump();
      }
      if (key === 'shift') {
        sounds.click(0.8);
        adapter.sneak(!botState.sneaking);
      }
      if (key === 'control') {
        sounds.click(1.1);
        adapter.sprint(!botState.sprinting);
      }
      if (key === 'q') {
        sounds.pop();
        adapter.dropItem();
        setLastActionText('Dropped active item');
      }
      if (key === 'e') {
        sounds.click();
        onNavigateTab('inventory');
      }
      if (key === 'f') {
        sounds.click();
        adapter.swapHand();
        setLastActionText('Swapped with offhand');
      }

      // Hotbar 1-9
      const num = parseInt(key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        sounds.click(1.0 + num * 0.05);
        adapter.selectSlot(num - 1);
        setLastActionText(`Equipped hotbar slot ${num}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      setPressedKeys((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      if (key === 'w') adapter.move('forward', false);
      if (key === 's') adapter.move('back', false);
      if (key === 'a') adapter.move('left', false);
      if (key === 'd') adapter.move('right', false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [adapter, botState.sneaking, botState.sprinting, onNavigateTab, pressedKeys]);

  const handleAttack = async () => {
    sounds.attack();
    setAttackAnimation(true);
    setTimeout(() => setAttackAnimation(false), 300);
    const res = await adapter.attack();
    setLastActionText(`Attack -> ${res.target || 'miss'}`);
  };

  const handleInteract = async () => {
    sounds.click(0.9);
    const res = await adapter.interact();
    setLastActionText(res.action || 'Interact executed');
  };

  const handleDrop = async () => {
    sounds.pop();
    await adapter.dropItem();
    setLastActionText('Dropped 1x item');
  };

  const handleSelectSlot = (idx: number) => {
    sounds.click(1.0 + idx * 0.05);
    adapter.selectSlot(idx);
    setLastActionText(`Equipped slot ${idx + 1}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" /> Real-Time Bot Controls
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Desktop Keyboard (W, A, S, D, Space, Shift, 1-9) and Mobile Touchpad compatible.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">POS:</span> ({botState.position.x}, {botState.position.y}, {botState.position.z})
          </div>
          <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400">
            <span className="text-zinc-500">ACTION:</span> {lastActionText}
          </div>
        </div>
      </div>

      {/* Main Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Movement D-Pad & Keypad Visualizer (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80 text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> DIRECTIONAL MOVEMENT PAD
            </span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] ${botState.sprinting ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold' : 'text-zinc-600'}`}>
                SPRINT (CTRL)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${botState.sneaking ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold' : 'text-zinc-600'}`}>
                SNEAK (SHIFT)
              </span>
            </div>
          </div>

          {/* D-Pad Buttons (Works with Mouse / Touch & Shows Keyboard Press State) */}
          <div className="relative w-64 h-64 flex flex-col items-center justify-center gap-2 select-none">
            {/* W / Forward */}
            <button
              onPointerDown={() => adapter.move('forward', true)}
              onPointerUp={() => adapter.move('forward', false)}
              onPointerLeave={() => adapter.move('forward', false)}
              className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border font-mono font-bold transition-all shadow-lg active:scale-95 ${
                pressedKeys['w']
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_#10b981]'
                  : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <ArrowUp className="w-6 h-6" />
              <span className="text-xs mt-1">W</span>
            </button>

            {/* A, S, D Row */}
            <div className="flex items-center gap-2">
              {/* A / Left */}
              <button
                onPointerDown={() => adapter.move('left', true)}
                onPointerUp={() => adapter.move('left', false)}
                onPointerLeave={() => adapter.move('left', false)}
                className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border font-mono font-bold transition-all shadow-lg active:scale-95 ${
                  pressedKeys['a']
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_#10b981]'
                    : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <ArrowLeft className="w-6 h-6" />
                <span className="text-xs mt-1">A</span>
              </button>

              {/* S / Back */}
              <button
                onPointerDown={() => adapter.move('back', true)}
                onPointerUp={() => adapter.move('back', false)}
                onPointerLeave={() => adapter.move('back', false)}
                className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border font-mono font-bold transition-all shadow-lg active:scale-95 ${
                  pressedKeys['s']
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_#10b981]'
                    : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <ArrowDown className="w-6 h-6" />
                <span className="text-xs mt-1">S</span>
              </button>

              {/* D / Right */}
              <button
                onPointerDown={() => adapter.move('right', true)}
                onPointerUp={() => adapter.move('right', false)}
                onPointerLeave={() => adapter.move('right', false)}
                className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center border font-mono font-bold transition-all shadow-lg active:scale-95 ${
                  pressedKeys['d']
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_#10b981]'
                    : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <ArrowRight className="w-6 h-6" />
                <span className="text-xs mt-1">D</span>
              </button>
            </div>
          </div>

          {/* Jump / Spacebar Control */}
          <div className="w-full max-w-sm mt-6">
            <button
              onClick={() => {
                sounds.click(1.2);
                adapter.jump();
              }}
              className={`w-full py-3 rounded-xl border font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                pressedKeys[' '] || !botState.isGrounded
                  ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-[0_0_15px_#06b6d4]'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              <Footprints className="w-4 h-4" /> JUMP (SPACE)
            </button>
          </div>
        </div>

        {/* Right Column: Combat & Action Triggers (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/80 text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Sword className="w-3.5 h-3.5 text-red-400" /> ACTIONS & COMBAT
              </span>
              <span className="text-zinc-500">Touch or Click</span>
            </div>

            {/* Action buttons grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Primary Attack Button */}
              <button
                onClick={handleAttack}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 font-mono font-bold transition-all shadow-md active:scale-95 ${
                  attackAnimation
                    ? 'bg-red-600 text-white border-red-400 scale-95 shadow-[0_0_20px_#ef4444]'
                    : 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-800/60'
                }`}
              >
                <Sword className={`w-7 h-7 transform -rotate-45 transition-transform ${attackAnimation ? '-rotate-90 scale-125' : ''}`} />
                <span className="text-xs uppercase">Attack (Hit)</span>
              </button>

              {/* Interact / Use Button */}
              <button
                onClick={handleInteract}
                className="p-4 rounded-xl border bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-800/60 flex flex-col items-center justify-center gap-2 font-mono font-bold transition-all shadow-md active:scale-95"
              >
                <Hand className="w-7 h-7" />
                <span className="text-xs uppercase">Interact (Use)</span>
              </button>

              {/* Sneak Toggle */}
              <button
                onClick={() => {
                  sounds.click(0.8);
                  adapter.sneak(!botState.sneaking);
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs transition-colors ${
                  botState.sneaking
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                Sneak: {botState.sneaking ? 'ON' : 'OFF'}
              </button>

              {/* Sprint Toggle */}
              <button
                onClick={() => {
                  sounds.click(1.1);
                  adapter.sprint(!botState.sprinting);
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs transition-colors ${
                  botState.sprinting
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                Sprint: {botState.sprinting ? 'ON' : 'OFF'}
              </button>

              {/* Swap Hand */}
              <button
                onClick={() => {
                  sounds.click();
                  adapter.swapHand();
                  setLastActionText('Swapped hand item');
                }}
                className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center justify-center gap-2 font-mono text-xs transition-colors"
              >
                <Repeat className="w-3.5 h-3.5 text-zinc-400" /> Swap Hand (F)
              </button>

              {/* Drop Active Item */}
              <button
                onClick={handleDrop}
                className="p-3 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-300 hover:text-red-400 border border-zinc-700 flex items-center justify-center gap-2 font-mono text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Drop Item (Q)
              </button>
            </div>
          </div>

          {/* Quick link to inventory */}
          <div className="pt-4 border-t border-zinc-800/80 mt-4">
            <button
              onClick={() => {
                sounds.click();
                onNavigateTab('inventory');
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Package className="w-4 h-4 text-amber-400" /> View Full Inventory & Armor (E) →
            </button>
          </div>
        </div>
      </div>

      {/* Hotbar 1 - 9 Visual Strip */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" /> ACTIVE HOTBAR SLOTS (1 - 9)
          </span>
          <span className="text-zinc-500">Press 1-9 on keyboard or tap slot</span>
        </div>

        <div className="grid grid-cols-9 gap-2 overflow-x-auto pb-1">
          {inventory.hotbar.map((item, idx) => {
            const isSelected = botState.selectedSlot === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelectSlot(idx)}
                className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all p-1 ${
                  isSelected
                    ? 'bg-zinc-800 border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-105 z-10'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
                title={item ? `${item.displayName} (Slot ${idx + 1})` : `Empty Slot ${idx + 1}`}
              >
                {/* Slot index label */}
                <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-zinc-500">
                  {idx + 1}
                </span>

                <ItemIcon item={item} size="md" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
