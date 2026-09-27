import React, { useState } from 'react';
import {
  Package,
  Shield,
  Trash2,
  Repeat,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import { BotInventory, BotState, InventorySlot } from '../../types/minecraft';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { ItemIcon } from '../common/ItemIcon';
import { sounds } from '../../lib/audio';

interface InventoryViewProps {
  inventory: BotInventory;
  botState: BotState;
  adapter: BotAdapter;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  botState,
  adapter,
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    item: InventorySlot;
    slotType: 'armor' | 'offhand' | 'main' | 'hotbar';
    slotIndex: number;
  } | null>(null);

  const handleSelectSlot = (
    item: InventorySlot | null,
    slotType: 'armor' | 'offhand' | 'main' | 'hotbar',
    slotIndex: number
  ) => {
    sounds.click();
    if (item) {
      setSelectedItem({ item, slotType, slotIndex });
    } else {
      setSelectedItem(null);
    }
  };

  const handleDropSelected = async () => {
    if (!selectedItem) return;
    sounds.pop();
    await adapter.dropItem(selectedItem.slotType === 'hotbar' ? selectedItem.slotIndex : undefined);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Package className="w-5 h-5 text-amber-400" /> Minecraft Visual Inventory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time synchronization with Mineflayer player inventory and equipment slots.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span>Active Hand Slot:</span>
          <span className="font-bold text-emerald-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            Slot {botState.selectedSlot + 1}
          </span>
        </div>
      </div>

      {/* Main Grid & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Equipment & Main Inventory (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Armor & Offhand Rack */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" /> Equipped Armor & Offhand
            </div>

            <div className="grid grid-cols-5 gap-3 max-w-md">
              {/* Helmet */}
              <div
                onClick={() => handleSelectSlot(inventory.helmet, 'armor', 36)}
                className="aspect-square rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors relative"
              >
                <span className="absolute top-1 left-2 text-[9px] font-mono text-zinc-500 uppercase">Head</span>
                <ItemIcon item={inventory.helmet} size="md" />
              </div>

              {/* Chestplate */}
              <div
                onClick={() => handleSelectSlot(inventory.chestplate, 'armor', 37)}
                className="aspect-square rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors relative"
              >
                <span className="absolute top-1 left-2 text-[9px] font-mono text-zinc-500 uppercase">Chest</span>
                <ItemIcon item={inventory.chestplate} size="md" />
              </div>

              {/* Leggings */}
              <div
                onClick={() => handleSelectSlot(inventory.leggings, 'armor', 38)}
                className="aspect-square rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors relative"
              >
                <span className="absolute top-1 left-2 text-[9px] font-mono text-zinc-500 uppercase">Legs</span>
                <ItemIcon item={inventory.leggings} size="md" />
              </div>

              {/* Boots */}
              <div
                onClick={() => handleSelectSlot(inventory.boots, 'armor', 39)}
                className="aspect-square rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors relative"
              >
                <span className="absolute top-1 left-2 text-[9px] font-mono text-zinc-500 uppercase">Feet</span>
                <ItemIcon item={inventory.boots} size="md" />
              </div>

              {/* Offhand */}
              <div
                onClick={() => handleSelectSlot(inventory.offhand, 'offhand', 40)}
                className="aspect-square rounded-xl bg-zinc-950 border border-indigo-900/60 hover:border-indigo-700 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors relative"
              >
                <span className="absolute top-1 left-2 text-[9px] font-mono text-indigo-400 uppercase">Shield</span>
                <ItemIcon item={inventory.offhand} size="md" />
              </div>
            </div>
          </div>

          {/* 27-slot Main Inventory Grid */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Storage Inventory (27 Slots)
            </div>

            <div className="grid grid-cols-9 gap-2">
              {inventory.main.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSlot(item, 'main', idx)}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                    selectedItem?.slotIndex === idx && selectedItem?.slotType === 'main'
                      ? 'bg-zinc-800 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                      : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <ItemIcon item={item} size="md" />
                </div>
              ))}
            </div>
          </div>

          {/* 9-slot Hotbar Grid */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Hotbar (Slots 1 - 9)
            </div>

            <div className="grid grid-cols-9 gap-2">
              {inventory.hotbar.map((item, idx) => {
                const isActiveHand = botState.selectedSlot === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      adapter.selectSlot(idx);
                      handleSelectSlot(item, 'hotbar', idx);
                    }}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative ${
                      isActiveHand
                        ? 'bg-zinc-800 border-emerald-400 ring-2 ring-emerald-500/50 shadow-md scale-105 z-10'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-zinc-500">
                      {idx + 1}
                    </span>
                    <ItemIcon item={item} size="md" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Item Inspector (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" /> Item Inspector
            </div>

            {selectedItem ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                    <ItemIcon item={selectedItem.item} size="lg" showCount={false} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono">
                      {selectedItem.item.displayName}
                    </h3>
                    <div className="text-xs font-mono text-zinc-400 mt-0.5">
                      Stack: {selectedItem.item.count} / {selectedItem.item.maxStackSize}
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">
                      {selectedItem.item.rarity || 'common'}
                    </span>
                  </div>
                </div>

                {/* Enchantments list */}
                {selectedItem.item.enchantments && selectedItem.item.enchantments.length > 0 && (
                  <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-900/40 text-xs font-mono space-y-1">
                    <div className="text-purple-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Enchantments
                    </div>
                    {selectedItem.item.enchantments.map((ench, i) => (
                      <div key={i} className="text-purple-300">
                        • {ench}
                      </div>
                    ))}
                  </div>
                )}

                {/* Durability */}
                {selectedItem.item.durability && (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Durability</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedItem.item.durability.current} / {selectedItem.item.durability.max}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${(selectedItem.item.durability.current / selectedItem.item.durability.max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-center space-y-2">
                <Package className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs font-mono text-zinc-500">
                  Click any armor, hotbar, or inventory slot to inspect metadata and perform actions.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {selectedItem && (
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                onClick={handleDropSelected}
                className="w-full py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/60 font-mono text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Drop / Toss Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
