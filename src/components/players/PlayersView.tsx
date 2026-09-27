import React, { useState } from 'react';
import {
  Users,
  Search,
  Compass,
  Footprints,
  MessageSquare,
  Shield,
  Heart,
  Wifi,
  ExternalLink,
  Square,
} from 'lucide-react';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { BotState, PlayerInfo } from '../../types/minecraft';
import { sounds } from '../../lib/audio';

interface PlayersViewProps {
  players: PlayerInfo[];
  botState: BotState;
  adapter: BotAdapter;
  onNavigateTab: (tab: 'chat' | 'controls') => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  botState,
  adapter,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = players.filter((p) =>
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFollowing = (username: string) => {
    return (
      botState.currentTask?.type === 'follow' &&
      botState.currentTask?.targetPlayer?.toLowerCase() === username.toLowerCase() &&
      botState.currentTask?.status === 'running'
    );
  };

  const handleFollowPlayer = async (player: PlayerInfo) => {
    sounds.click(1.2);
    await adapter.startTask({
      title: `Follow ${player.username}`,
      type: 'follow',
      targetPlayer: player.username,
      targetCoords: player.position,
      targetDetails: `Continuous tracking at 3-block distance`,
    });
  };

  const handleStopFollowing = async () => {
    sounds.error();
    if (botState.currentTask) {
      await adapter.stopTask(botState.currentTask.id);
    }
  };

  const handleTeleportTo = async (player: PlayerInfo) => {
    sounds.click(1.1);
    await adapter.executeCommand(
      `/tp ${botState.username} ${player.position.x} ${player.position.y} ${player.position.z}`
    );
  };

  const handleWhisper = (player: PlayerInfo) => {
    sounds.click();
    adapter.chat(`/msg ${player.username} Hey, I am an automated bot!`);
    onNavigateTab('chat');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Users className="w-5 h-5 text-cyan-400" /> Connected Server Players Radar
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time entity radar tracking coordinates, distance, health, and follow states.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => {
          const followingThis = isFollowing(player.username);
          return (
            <div
              key={player.uuid}
              className={`p-5 rounded-xl border transition-all ${
                followingThis
                  ? 'bg-zinc-900/90 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar Icon */}
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center font-mono font-bold text-cyan-300 text-base shadow-inner">
                    {player.username.charAt(0)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-zinc-100 font-mono">{player.username}</h3>
                      {player.isOperator && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          OP
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      UUID: {player.uuid.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    player.isOnline
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {player.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Player Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Distance</span>
                  <span className="text-cyan-400 font-bold">{player.distance} meters</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Health</span>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-red-500" /> {player.health} / 20
                  </span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800 col-span-2">
                  <span className="text-zinc-500 text-[10px] block">Coordinates</span>
                  <span className="text-zinc-300">
                    X: {player.position.x} | Y: {player.position.y} | Z: {player.position.z}
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs font-mono">
                {followingThis ? (
                  <button
                    onClick={handleStopFollowing}
                    className="py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop Following
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollowPlayer(player)}
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <Footprints className="w-3.5 h-3.5" /> Follow Player
                  </button>
                )}

                <button
                  onClick={() => handleWhisper(player)}
                  className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Whisper
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
