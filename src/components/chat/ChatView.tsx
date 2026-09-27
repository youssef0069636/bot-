import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Terminal,
  Trash2,
} from 'lucide-react';
import { ChatMessage } from '../../types/minecraft';
import { BotAdapter } from '../../lib/bot/BotAdapter';
import { sounds } from '../../lib/audio';

interface ChatViewProps {
  chatMessages: ChatMessage[];
  adapter: BotAdapter;
  botUsername: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatMessages,
  adapter,
  botUsername,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputMessage.trim();
    if (!clean) return;

    sounds.pop();
    setInputMessage('');
    setIsSending(true);

    try {
      await adapter.chat(clean);
    } finally {
      setIsSending(false);
    }
  };

  const quickChips = [
    { label: 'Hello everyone!', cmd: 'Hello everyone!' },
    { label: '/spawn', cmd: '/spawn' },
    { label: '/list players', cmd: '/list' },
    { label: '/time set day', cmd: '/time set day' },
    { label: '/weather clear', cmd: '/weather clear' },
    { label: 'Come to coordinates', cmd: 'Come to coordinates!' },
  ];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100 font-mono">In-Game Minecraft Chat</h2>
          <span className="text-[10px] font-mono text-zinc-500">({chatMessages.length} messages)</span>
        </div>

        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <span>Posting as:</span>
          <span className="text-emerald-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            {botUsername}
          </span>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs overflow-y-auto space-y-2 shadow-inner">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
            No chat messages received yet. Send a message below to start chatting!
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isBot = msg.sender === botUsername || msg.type === 'bot';
            const isSystem = msg.type === 'system' || msg.sender.startsWith('[');
            const isCommand = msg.type === 'command';

            return (
              <div
                key={msg.id}
                className={`p-2 rounded-lg border leading-relaxed flex items-start gap-2.5 transition-colors ${
                  isSystem
                    ? 'bg-purple-950/20 border-purple-900/40 text-purple-300'
                    : isCommand
                    ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    : isBot
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-200'
                }`}
              >
                {/* Icon */}
                <div className="mt-0.5 select-none">
                  {isSystem && <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />}
                  {isCommand && <Terminal className="w-3.5 h-3.5 text-cyan-400" />}
                  {isBot && <Bot className="w-3.5 h-3.5 text-emerald-400" />}
                  {!isSystem && !isCommand && !isBot && <User className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`font-bold select-none ${
                        isSystem
                          ? 'text-purple-400'
                          : isCommand
                          ? 'text-cyan-400'
                          : isBot
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-zinc-600 select-none">[{msg.timestamp}]</span>
                  </div>
                  <div className="break-words select-text">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1 whitespace-nowrap pl-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Quick:
        </span>
        {quickChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => {
              sounds.click();
              adapter.chat(chip.cmd);
            }}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-mono text-[11px] whitespace-nowrap transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Send a chat message (or slash command: /say hello, /tp, /spawn)..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-emerald-500/60 shadow-lg"
        />
        <button
          type="submit"
          disabled={isSending || !inputMessage.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </form>
    </div>
  );
};
