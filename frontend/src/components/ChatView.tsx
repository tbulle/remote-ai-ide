import { useEffect, useRef, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import type { ChatMessage } from '../hooks/useSession';
import VoiceButton from './VoiceButton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface ChatViewProps {
  messages: ChatMessage[];
  status: 'ready' | 'busy' | 'error';
  onSend: (text: string) => void;
  onInterrupt: () => void;
  onReset: () => void;
}

function formatContent(content: string) {
  // Split on code blocks (```...```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3);
      const firstNewline = lines.indexOf('\n');
      const code = firstNewline >= 0 ? lines.slice(firstNewline + 1) : lines;
      return (
        <pre
          key={i}
          className="bg-[#0d1117] rounded p-3 my-2 text-sm overflow-x-auto"
        >
          <code>{code}</code>
        </pre>
      );
    }
    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
  });
}

export default function ChatView({
  messages,
  status,
  onSend,
  onInterrupt,
  onReset,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendFromShortcut = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  useKeyboardShortcuts({
    status,
    onInterrupt,
    onSend: handleSendFromShortcut,
    inputRef,
    scrollRef,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            Send a message to start
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[#0f3460] text-[#e0e0e0]'
                  : 'bg-[#16213e] text-[#e0e0e0]'
              )}
            >
              {formatContent(msg.content)}
              {msg.isStreaming && (
                <span className="inline-block w-2 h-2 ml-1 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        ))}

        {status === 'busy' && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-[#16213e] rounded-2xl px-4 py-2">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t border-[#16213e] bg-[#1a1a2e]"
      >
        <VoiceButton />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#16213e] text-[#e0e0e0] rounded-full px-4 py-3 text-sm outline-none placeholder-gray-500 min-h-[44px]"
          disabled={status === 'error'}
        />
        {status === 'busy' ? (
          <button
            type="button"
            onClick={onInterrupt}
            className="bg-red-600 text-white rounded-full w-11 h-11 flex items-center justify-center shrink-0"
            title="Stop"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : status === 'error' ? (
          <button
            type="button"
            onClick={onReset}
            className="bg-amber-500 text-white rounded-full px-4 h-11 flex items-center justify-center shrink-0"
            title="Retry"
          >
            Retry
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-[#0f3460] text-white rounded-full w-11 h-11 flex items-center justify-center shrink-0 disabled:opacity-40"
            title="Send"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
