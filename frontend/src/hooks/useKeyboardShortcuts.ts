import { useEffect, type RefObject } from 'react';

interface UseKeyboardShortcutsOptions {
  status: 'ready' | 'busy' | 'error';
  onInterrupt: () => void;
  onSend: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function useKeyboardShortcuts({
  status,
  onInterrupt,
  onSend,
  inputRef,
  scrollRef,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const inputFocused = document.activeElement === inputRef.current;

      // Escape or Ctrl+C while busy → interrupt
      if (status === 'busy' && (e.key === 'Escape' || (e.key === 'c' && e.ctrlKey))) {
        e.preventDefault();
        onInterrupt();
        return;
      }

      // Ctrl/Cmd+Enter → send
      if (e.key === 'Enter' && mod && inputFocused) {
        e.preventDefault();
        onSend();
        return;
      }

      // "/" when input not focused → focus input
      if (e.key === '/' && !inputFocused && !mod && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Ctrl/Cmd+L → scroll to bottom
      if (e.key === 'l' && mod) {
        e.preventDefault();
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, onInterrupt, onSend, inputRef, scrollRef]);
}
