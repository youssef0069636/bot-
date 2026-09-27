import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Compass,
  Users,
  Activity,
  Layers,
  StopCircle,
} from 'lucide-react';
import { AIStructuredAction, BotState, PlayerInfo } from '../../types/minecraft';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { AIPlanner, ActionPlanResult } from '../../lib/ai/planner';
import { sounds } from '../../lib/audio';

interface AIAssistantViewProps {
  botState: BotState;
  players: PlayerInfo[];
  adapter: BotAdapter;
  onNavigateTab: (tab: 'tasks' | 'controls') => void;
}

interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  planResult?: ActionPlanResult;
  status?: 'pending_authorization' | 'executed' | 'dismissed';
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  botState,
  players,
  adapter,
  onNavigateTab,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Greetings Commander. I am your Minecraft Autonomous AI Planner. I convert natural language into validated, structured action plans to protect the bot from void damage, lava, and hostile threats.',
      timestamp: 'Ready',
    },
  ]);

  const suggestionPrompts = [
    'Go to the village.',
    'Find iron.',
    'Follow Steve.',
    'Come back to spawn.',
    'Check my inventory.',
    'Tell me my coordinates.',
    'Stop the current task.',
  ];

  const handleProcessPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || isProcessing) return;

    sounds.pop();
    setInputPrompt('');
    setIsProcessing(true);

    const time = new Date().toLocaleTimeString();
    const userMsgId = 'usr_' + Date.now();
    const newMessages: AIMessage[] = [
      ...messages,
      { id: userMsgId, sender: 'user', text, timestamp: time },
    ];
    setMessages(newMessages);

    // Call API or local rule engine
    let planResult: ActionPlanResult;
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, currentState: botState, players }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          planResult = {
            rawPrompt: text,
            structuredAction: data.plan,
            canAutoExecute: data.plan.safetyRisk === 'safe',
            warnings: [],
          };
        } else {
          planResult = AIPlanner.planLocally(text, botState, players);
        }
      } else {
        planResult = AIPlanner.planLocally(text, botState, players);
      }
    } catch {
      planResult = AIPlanner.planLocally(text, botState, players);
    }

    const aiMsgId = 'ai_' + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        sender: 'assistant',
        text: planResult.structuredAction.explanation,
        timestamp: new Date().toLocaleTimeString(),
        planResult,
        status: planResult.canAutoExecute ? 'executed' : 'pending_authorization',
      },
    ]);

    if (planResult.canAutoExecute) {
      executeAction(planResult.structuredAction);
    } else {
      sounds.chime();
    }

    setIsProcessing(false);
  };

  const executeAction = async (action: AIStructuredAction) => {
    sounds.click(1.2);
    switch (action.action) {
      case 'stop':
        if (botState.currentTask) {
          await adapter.stopTask(botState.currentTask.id);
        }
        await adapter.executeCommand('stop');
        break;
      case 'move_to':
        if (action.target?.x !== undefined && action.target?.z !== undefined) {
          await adapter.startTask({
            title: `Navigate to (${action.target.x}, ${action.target.y ?? 64}, ${action.target.z})`,
            type: 'goto',
            targetCoords: {
              x: action.target.x,
              y: action.target.y ?? 64,
              z: action.target.z,
            },
            targetDetails: action.explanation,
          });
        }
        break;
      case 'follow_player':
        if (action.target?.name) {
          const pl = players.find((p) => p.username.toLowerCase() === action.target!.name!.toLowerCase());
          await adapter.startTask({
            title: `Follow ${action.target.name}`,
            type: 'follow',
            targetPlayer: action.target.name,
            targetCoords: pl?.position,
          });
        }
        break;
      case 'mine_block':
        await adapter.startTask({
          title: `Mine ${action.target?.name || 'ore'}`,
          type: 'find_block',
          targetDetails: `Scanning layer Y=${action.target?.y ?? 16}`,
        });
        break;
      case 'chat':
        if (action.target?.message) {
          await adapter.chat(action.target.message);
        }
        break;
      default:
        break;
    }
  };

  const handleAuthorize = async (msgId: string, action: AIStructuredAction) => {
    await executeAction(action);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: 'executed' } : m))
    );
  };

  const handleDismiss = (msgId: string) => {
    sounds.error();
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: 'dismissed' } : m))
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Header Pipeline Overview */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 font-mono">
              <Bot className="w-5 h-5 text-emerald-400" /> Minecraft AI Command & Planning Engine
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Strict Structured Action validation prevents fatal void damage, lava pits, and untrusted execution.
            </p>
          </div>

          {/* Visual Pipeline Steps */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 overflow-x-auto pb-1">
            <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800">User Prompt</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-cyan-400">Gemini / NLP</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-amber-400">Validation</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400">BotAdapter</span>
          </div>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 text-[10px] text-zinc-500">
              <span className="font-bold text-zinc-400 uppercase">
                {msg.sender === 'user' ? 'Operator' : 'AI Assistant'}
              </span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded-xl max-w-2xl leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600/90 text-white rounded-br-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
              }`}
            >
              <div>{msg.text}</div>

              {/* Structured Action Verification Card */}
              {msg.planResult && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> Structured Action
                    </span>

                    {/* Risk Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border ${
                        msg.planResult.structuredAction.safetyRisk === 'safe'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : msg.planResult.structuredAction.safetyRisk === 'caution'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-red-950/60 text-red-400 border-red-800/60'
                      }`}
                    >
                      {msg.planResult.structuredAction.safetyRisk === 'safe' && <ShieldCheck className="w-3 h-3" />}
                      {msg.planResult.structuredAction.safetyRisk === 'caution' && <AlertTriangle className="w-3 h-3" />}
                      {msg.planResult.structuredAction.safetyRisk === 'dangerous' && <Flame className="w-3 h-3" />}
                      {msg.planResult.structuredAction.safetyRisk} Risk
                    </span>
                  </div>

                  {/* JSON Action details preview */}
                  <pre className="p-2 rounded bg-zinc-900 text-zinc-300 text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(
                      {
                        action: msg.planResult.structuredAction.action,
                        target: msg.planResult.structuredAction.target,
                      },
                      null,
                      2
                    )}
                  </pre>

                  {msg.planResult.structuredAction.riskReason && (
                    <div className="text-[11px] text-amber-400 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{msg.planResult.structuredAction.riskReason}</span>
                    </div>
                  )}

                  {/* Authorization buttons */}
                  {msg.status === 'pending_authorization' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => handleAuthorize(msg.id, msg.planResult!.structuredAction)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Authorize & Execute
                      </button>
                      <button
                        onClick={() => handleDismiss(msg.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-mono text-xs transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Dismiss Plan
                      </button>
                    </div>
                  )}

                  {msg.status === 'executed' && (
                    <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Action Authorized & Dispatched to BotAdapter.
                    </div>
                  )}

                  {msg.status === 'dismissed' && (
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 pt-1">
                      <XCircle className="w-3.5 h-3.5" /> Action dismissed by operator.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-4 h-4 animate-spin" /> Planning autonomous actions...
          </div>
        )}
      </div>

      {/* Suggested prompts strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1 whitespace-nowrap pl-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Prompts:
        </span>
        {suggestionPrompts.map((s, i) => (
          <button
            key={i}
            onClick={() => handleProcessPrompt(s)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-mono text-[11px] whitespace-nowrap transition-colors"
          >
            "{s}"
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleProcessPrompt(inputPrompt);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          placeholder='Ask AI Assistant (e.g. "Go to the village", "Find iron", "Follow Steve", "Stop")...'
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-emerald-500/60 shadow-lg"
        />
        <button
          type="submit"
          disabled={isProcessing || !inputPrompt.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Plan
        </button>
      </form>
    </div>
  );
};
