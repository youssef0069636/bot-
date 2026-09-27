import React, { useState } from 'react';
import {
  ListTodo,
  Plus,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  Clock,
  Compass,
  Users,
  Shield,
  Pickaxe,
  Package,
  Sparkles,
  MapPin,
  X,
} from 'lucide-react';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { BotState, BotTask, Coordinates, PlayerInfo, TaskType } from '../../types/minecraft';
import { sounds } from '../../lib/audio';

interface TasksViewProps {
  botState: BotState;
  players: PlayerInfo[];
  adapter: BotAdapter;
}

export const TasksView: React.FC<TasksViewProps> = ({
  botState,
  players,
  adapter,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('goto');
  const [targetCoords, setTargetCoords] = useState<{ x: string; y: string; z: string }>({
    x: '100',
    y: '64',
    z: '200',
  });
  const [targetPlayer, setTargetPlayer] = useState(players[0]?.username || 'Steve');
  const [targetItem, setTargetItem] = useState('diamond_ore');

  // Completed / past tasks ledger
  const [pastTasks, setPastTasks] = useState<BotTask[]>([
    {
      id: 'task_demo_1',
      title: 'Scout Perimeter North',
      type: 'patrol',
      status: 'completed',
      progress: 100,
      startedAt: '18:02:10',
      lastAction: 'Perimeter secure. 0 hostiles detected.',
    },
    {
      id: 'task_demo_2',
      title: 'Mine 8x Iron Ore at Y=16',
      type: 'find_block',
      status: 'completed',
      progress: 100,
      startedAt: '17:45:20',
      lastAction: 'Collected 8x raw iron and returned to surface.',
    },
  ]);

  const activeTask = botState.currentTask;

  const handleStartPreset = async (presetType: TaskType) => {
    sounds.click();
    let title = '';
    let coords: Coordinates | undefined = undefined;
    let player: string | undefined = undefined;

    switch (presetType) {
      case 'spawn':
        title = 'Return to World Spawn';
        coords = { x: 0, y: 64, z: 0 };
        break;
      case 'patrol':
        title = 'Autonomous Base Perimeter Patrol';
        break;
      case 'guard':
        title = `Guard Position (${botState.position.x}, ${botState.position.y}, ${botState.position.z})`;
        coords = botState.position;
        break;
      case 'follow':
        const targetPl = players[0]?.username || 'Steve';
        title = `Follow Player ${targetPl}`;
        player = targetPl;
        coords = players[0]?.position;
        break;
      default:
        title = `Execute ${presetType}`;
        break;
    }

    await adapter.startTask({
      title,
      type: presetType,
      targetCoords: coords,
      targetPlayer: player,
      targetDetails: `Autonomous execution via Control Center`,
    });
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.click(1.2);

    let title = '';
    let coords: Coordinates | undefined = undefined;
    let player: string | undefined = undefined;

    if (selectedTaskType === 'goto') {
      const x = parseFloat(targetCoords.x) || 0;
      const y = parseFloat(targetCoords.y) || 64;
      const z = parseFloat(targetCoords.z) || 0;
      title = `Go to coordinates (${x}, ${y}, ${z})`;
      coords = { x, y, z };
    } else if (selectedTaskType === 'follow') {
      title = `Follow player ${targetPlayer}`;
      player = targetPlayer;
    } else if (selectedTaskType === 'find_block') {
      title = `Mine / find ${targetItem.replace('_', ' ')}`;
    } else if (selectedTaskType === 'collect') {
      title = `Collect ${targetItem.replace('_', ' ')}`;
    } else {
      title = `Task: ${selectedTaskType}`;
    }

    setShowCreateModal(false);

    await adapter.startTask({
      title,
      type: selectedTaskType,
      targetCoords: coords,
      targetPlayer: player,
      targetDetails: `Custom task configured by operator`,
    });
  };

  const handlePause = async () => {
    sounds.click(0.8);
    if (activeTask) await adapter.pauseTask(activeTask.id);
  };

  const handleResume = async () => {
    sounds.click(1.1);
    if (activeTask) await adapter.resumeTask(activeTask.id);
  };

  const handleStop = async () => {
    sounds.error();
    if (activeTask) {
      await adapter.stopTask(activeTask.id);
      setPastTasks((prev) => [
        { ...activeTask, status: 'failed', lastAction: 'Aborted by operator' },
        ...prev,
      ]);
    }
  };

  const handleRetry = async () => {
    sounds.click(1.2);
    if (activeTask) {
      await adapter.startTask({
        title: activeTask.title,
        type: activeTask.type,
        targetCoords: activeTask.targetCoords,
        targetPlayer: activeTask.targetPlayer,
        targetDetails: activeTask.targetDetails,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <ListTodo className="w-5 h-5 text-emerald-400" /> AI Task Automation Manager
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pathfinding, player stalking, resource collection, and perimeter patrol queues.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.click();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Custom Task
        </button>
      </div>

      {/* Active Task Section */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/80">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Current Execution State
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            {activeTask ? `ID: ${activeTask.id}` : 'Idle'}
          </span>
        </div>

        {activeTask ? (
          <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-zinc-100 font-mono">{activeTask.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      activeTask.status === 'running'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 animate-pulse'
                        : activeTask.status === 'paused'
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                        : activeTask.status === 'completed'
                        ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
                        : 'bg-red-950/60 text-red-400 border-red-800/60'
                    }`}
                  >
                    {activeTask.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-3 font-mono">
                  <span>Started: {activeTask.startedAt || 'Just now'}</span>
                  <span>•</span>
                  <span>Type: {activeTask.type.toUpperCase()}</span>
                </div>
              </div>

              {/* Task controls */}
              <div className="flex items-center gap-2">
                {activeTask.status === 'running' ? (
                  <button
                    onClick={handlePause}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 font-mono text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                ) : activeTask.status === 'paused' ? (
                  <button
                    onClick={handleResume}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                ) : null}

                <button
                  onClick={handleStop}
                  className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>

                <button
                  onClick={handleRetry}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {activeTask.lastAction || 'Processing pathfinding algorithms...'}
                </span>
                <span className="text-emerald-400 font-bold">{activeTask.progress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${activeTask.progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-center space-y-3">
            <ListTodo className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-400 font-mono">
              No tasks currently running. Choose a preset below or create a custom task.
            </p>
          </div>
        )}
      </div>

      {/* Preset Tasks Deck */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" /> Quick Autonomous Presets
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleStartPreset('spawn')}
            className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 text-left transition-colors group"
          >
            <Compass className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-xs text-zinc-200">Go to Spawn</div>
            <div className="text-[11px] text-zinc-500 mt-1">Navigate to origin coordinates (0, 64, 0)</div>
          </button>

          <button
            onClick={() => handleStartPreset('patrol')}
            className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 text-left transition-colors group"
          >
            <Shield className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-xs text-zinc-200">Patrol Perimeter</div>
            <div className="text-[11px] text-zinc-500 mt-1">Circulate 30 blocks radius around current spot</div>
          </button>

          <button
            onClick={() => handleStartPreset('guard')}
            className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 text-left transition-colors group"
          >
            <MapPin className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-xs text-zinc-200">Guard Location</div>
            <div className="text-[11px] text-zinc-500 mt-1">Stand sentry and alert on hostile mobs</div>
          </button>

          <button
            onClick={() => handleStartPreset('follow')}
            className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 text-left transition-colors group"
          >
            <Users className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-semibold text-xs text-zinc-200">Follow Player</div>
            <div className="text-[11px] text-zinc-500 mt-1">Lock pathfinder behind nearest player</div>
          </button>
        </div>
      </div>

      {/* Task History Ledger */}
      <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Task Execution History
        </h3>

        <div className="space-y-2">
          {pastTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-zinc-200">{task.title}</div>
                  <div className="text-[11px] text-zinc-500">{task.lastAction}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500">{task.startedAt}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 uppercase">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-zinc-100 font-mono flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Configure New Bot Task
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomTask} className="space-y-4 text-xs font-mono">
              {/* Task Type selector */}
              <div>
                <label className="block text-zinc-400 mb-1.5">Task Objective</label>
                <select
                  value={selectedTaskType}
                  onChange={(e) => setSelectedTaskType(e.target.value as TaskType)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="goto">Go to Coordinates</option>
                  <option value="follow">Follow Player</option>
                  <option value="find_block">Find / Mine Block</option>
                  <option value="collect">Collect Item</option>
                  <option value="patrol">Patrol Area</option>
                  <option value="guard">Guard Position</option>
                  <option value="spawn">Return to Spawn</option>
                </select>
              </div>

              {/* Conditional Inputs */}
              {selectedTaskType === 'goto' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-500 text-[10px]">Target X</label>
                    <input
                      type="number"
                      value={targetCoords.x}
                      onChange={(e) => setTargetCoords({ ...targetCoords, x: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-[10px]">Target Y</label>
                    <input
                      type="number"
                      value={targetCoords.y}
                      onChange={(e) => setTargetCoords({ ...targetCoords, y: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-[10px]">Target Z</label>
                    <input
                      type="number"
                      value={targetCoords.z}
                      onChange={(e) => setTargetCoords({ ...targetCoords, z: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {selectedTaskType === 'follow' && (
                <div>
                  <label className="block text-zinc-400 mb-1.5">Select Target Player</label>
                  <select
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                  >
                    {players.map((p) => (
                      <option key={p.uuid} value={p.username}>
                        {p.username} ({p.distance}m away)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedTaskType === 'find_block' || selectedTaskType === 'collect') && (
                <div>
                  <label className="block text-zinc-400 mb-1.5">Target Material</label>
                  <select
                    value={targetItem}
                    onChange={(e) => setTargetItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                  >
                    <option value="diamond_ore">Diamond Ore</option>
                    <option value="iron_ore">Iron Ore</option>
                    <option value="gold_ore">Gold Ore</option>
                    <option value="ancient_debris">Ancient Debris (Nether)</option>
                    <option value="oak_log">Oak Wood Logs</option>
                    <option value="cobblestone">Cobblestone</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Start Task Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
