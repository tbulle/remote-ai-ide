import { useState, useEffect, useCallback, useRef } from 'react';
import type { WebSocketClient, PermissionRequest, ServerMessage } from '../api/ws';
import { apiCall } from '../api/rest';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  seq?: number;
}

interface PendingPermission {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

interface SessionReplayMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  seq: number;
}

interface SessionReplayResponse {
  messages: SessionReplayMessage[];
}

export function useSession(
  sessionId: string,
  wsClient: WebSocketClient | null,
  token: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'ready' | 'busy' | 'error'>('ready');
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const seqRef = useRef(0);
  const lastSeqRef = useRef(0);
  const hadConnectionRef = useRef(false);
  const replayInFlightRef = useRef(false);

  useEffect(() => {
    lastSeqRef.current = 0;
  }, [sessionId]);

  useEffect(() => {
    if (!wsClient) return;
    hadConnectionRef.current = wsClient.connected;

    // Switch to this session
    wsClient.send({ type: 'switch_session', sessionId });

    const offChunk = wsClient.on('assistant_chunk', (msg: ServerMessage) => {
      if (msg.type !== 'assistant_chunk' || msg.sessionId !== sessionId) return;
      lastSeqRef.current = Math.max(lastSeqRef.current, msg.seq);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming && last.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + msg.content },
          ];
        }
        return [
          ...prev,
          {
            id: `assistant-${msg.seq}`,
            role: 'assistant',
            content: msg.content,
            timestamp: Date.now(),
            isStreaming: true,
            seq: msg.seq,
          },
        ];
      });
      setStatus('busy');
    });

    const offMessage = wsClient.on('assistant_message', (msg: ServerMessage) => {
      if (msg.type !== 'assistant_message' || msg.sessionId !== sessionId) return;
      lastSeqRef.current = Math.max(lastSeqRef.current, msg.seq);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming && last.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              id: `assistant-${msg.seq}`,
              content: msg.content,
              isStreaming: false,
              seq: msg.seq,
            },
          ];
        }
        return [
          ...prev,
          {
            id: `assistant-${msg.seq}`,
            role: 'assistant',
            content: msg.content,
            timestamp: Date.now(),
            isStreaming: false,
            seq: msg.seq,
          },
        ];
      });
    });

    const offPermission = wsClient.on('permission_request', (msg: ServerMessage) => {
      if (msg.type !== 'permission_request' || msg.sessionId !== sessionId) return;
      const pr = msg as PermissionRequest;
      setPendingPermission({
        requestId: pr.requestId,
        toolName: pr.toolName,
        toolInput: pr.toolInput,
        description: pr.description,
      });
    });

    const offState = wsClient.on('session_state', (msg: ServerMessage) => {
      if (msg.type !== 'session_state' || msg.sessionId !== sessionId) return;
      setStatus(msg.status);
    });

    const offResult = wsClient.on('result', (msg: ServerMessage) => {
      if (msg.type !== 'result' || msg.sessionId !== sessionId) return;
      setStatus('ready');
    });

    const replayMissedMessages = async () => {
      if (!sessionId || !token) return;
      if (replayInFlightRef.current) return;
      replayInFlightRef.current = true;

      try {
        const data = await apiCall<SessionReplayResponse>(
          `/api/sessions/${encodeURIComponent(sessionId)}?since=${lastSeqRef.current}`,
          token
        );

        if (!data.messages.length) return;

        const sorted = [...data.messages].sort((a, b) => a.seq - b.seq);
        setMessages((prev) => {
          const existingSeqs = new Set(
            prev
              .map((m) => m.seq)
              .filter((seq): seq is number => typeof seq === 'number')
          );
          const updated = [...prev];

          for (const msg of sorted) {
            const last = updated[updated.length - 1];
            if (
              msg.role === 'assistant' &&
              last &&
              last.role === 'assistant' &&
              last.isStreaming
            ) {
              updated[updated.length - 1] = {
                ...last,
                id: `assistant-${msg.seq}`,
                content: msg.content,
                timestamp: msg.timestamp,
                isStreaming: false,
                seq: msg.seq,
              };
              existingSeqs.add(msg.seq);
              continue;
            }

            if (existingSeqs.has(msg.seq)) continue;

            if (msg.role === 'user') {
              const idx = [...updated].reverse().findIndex(
                (m) => m.role === 'user' && m.content === msg.content && m.seq == null
              );
              if (idx !== -1) {
                const realIdx = updated.length - 1 - idx;
                const existing = updated[realIdx];
                if (!existing) continue;
                updated[realIdx] = {
                  ...existing,
                  id: `user-${msg.seq}`,
                  seq: msg.seq,
                };
                existingSeqs.add(msg.seq);
                continue;
              }
            }

            updated.push({
              id: `${msg.role}-${msg.seq}`,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              isStreaming: false,
              seq: msg.seq,
            });
            existingSeqs.add(msg.seq);
          }

          return updated;
        });

        const lastMessage = sorted[sorted.length - 1];
        if (lastMessage) {
          lastSeqRef.current = Math.max(lastSeqRef.current, lastMessage.seq);
        }
      } catch {
        // Ignore replay errors on reconnect
      } finally {
        replayInFlightRef.current = false;
      }
    };

    const offConnected = wsClient.on('connected', () => {
      if (hadConnectionRef.current) {
        void replayMissedMessages();
      } else {
        hadConnectionRef.current = true;
      }
    });

    return () => {
      offChunk();
      offMessage();
      offPermission();
      offState();
      offResult();
      offConnected();
    };
  }, [wsClient, sessionId, token]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsClient || !text.trim()) return;

      seqRef.current++;
      const seq = seqRef.current;

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${seq}`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
          seq,
        },
      ]);

      wsClient.send({
        type: 'user_message',
        sessionId,
        text,
        seq,
      });

      setStatus('busy');
    },
    [wsClient, sessionId]
  );

  const respondPermission = useCallback(
    (allowed: boolean) => {
      if (!wsClient || !pendingPermission) return;

      wsClient.send({
        type: 'permission_response',
        sessionId,
        requestId: pendingPermission.requestId,
        allowed,
      });

      setPendingPermission(null);
    },
    [wsClient, sessionId, pendingPermission]
  );

  const interrupt = useCallback(() => {
    if (!wsClient) return;
    wsClient.send({ type: 'interrupt', sessionId });
  }, [wsClient, sessionId]);

  const resetSession = useCallback(() => {
    if (!wsClient) return;
    wsClient.send({ type: 'reset_session', sessionId });
  }, [wsClient, sessionId]);

  return {
    messages,
    status,
    pendingPermission,
    sendMessage,
    respondPermission,
    interrupt,
    resetSession,
  };
}
