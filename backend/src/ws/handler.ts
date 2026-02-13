import type { FastifyInstance } from 'fastify';
import type { ClientMessage, ServerMessage } from '../types/ws-messages.js';
import { sessionManager } from '../services/session-manager.js';
import { extractWsToken, validateToken } from '../services/auth.js';

function send(socket: { send: (data: string) => void }, msg: ServerMessage): void {
  socket.send(JSON.stringify(msg));
}

export async function wsHandler(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/ws',
    { websocket: true, config: { rateLimit: false } },
    (socket, req) => {
    const token = extractWsToken(req.url);
    if (!token || !validateToken(token)) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    const messageTimestamps: number[] = [];
    const windowMs = 60_000;
    const maxMessages = 30;

    const isRateLimited = (): boolean => {
      const now = Date.now();
      while (messageTimestamps.length > 0 && now - messageTimestamps[0] >= windowMs) {
        messageTimestamps.shift();
      }

      if (messageTimestamps.length >= maxMessages) {
        return true;
      }

      messageTimestamps.push(now);
      return false;
    };

    socket.on('message', async (raw: Buffer | string) => {
      if (isRateLimited()) {
        send(socket, {
          type: 'result',
          sessionId: '',
          success: false,
          error: 'Rate limit exceeded. Please slow down.',
          seq: 0,
        });
        return;
      }

      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(socket, {
          type: 'result',
          sessionId: '',
          success: false,
          error: 'Invalid JSON',
          seq: 0,
        });
        return;
      }

      switch (msg.type) {
        case 'user_message': {
          const session = sessionManager.get(msg.sessionId);
          if (!session) {
            send(socket, {
              type: 'result',
              sessionId: msg.sessionId,
              success: false,
              error: 'Session not found',
              seq: 0,
            });
            return;
          }

          send(socket, {
            type: 'session_state',
            sessionId: msg.sessionId,
            status: 'busy',
            messageCount: session.messageCount,
          });

          await session.sendMessage(
            msg.text,
            (content, seq) =>
              send(socket, {
                type: 'assistant_chunk',
                sessionId: msg.sessionId,
                content,
                seq,
              }),
            (permReq) =>
              send(socket, {
                type: 'permission_request',
                sessionId: msg.sessionId,
                ...permReq,
              }),
            (content, seq) => {
              send(socket, {
                type: 'assistant_message',
                sessionId: msg.sessionId,
                content,
                seq,
              });
              send(socket, {
                type: 'result',
                sessionId: msg.sessionId,
                success: true,
                seq,
              });
              send(socket, {
                type: 'session_state',
                sessionId: msg.sessionId,
                status: session.status,
                messageCount: session.messageCount,
              });
            },
            (error) => {
              send(socket, {
                type: 'result',
                sessionId: msg.sessionId,
                success: false,
                error,
                seq: 0,
              });
              send(socket, {
                type: 'session_state',
                sessionId: msg.sessionId,
                status: session.status,
                messageCount: session.messageCount,
              });
            },
          );
          break;
        }

        case 'permission_response': {
          sessionManager
            .get(msg.sessionId)
            ?.resolvePermission(msg.requestId, msg.allowed);
          break;
        }

        case 'interrupt': {
          sessionManager.get(msg.sessionId)?.abort();
          break;
        }

        case 'switch_session': {
          const session = sessionManager.get(msg.sessionId);
          if (session) {
            send(socket, {
              type: 'session_state',
              sessionId: msg.sessionId,
              status: session.status,
              messageCount: session.messageCount,
            });
          } else {
            send(socket, {
              type: 'result',
              sessionId: msg.sessionId,
              success: false,
              error: 'Session not found',
              seq: 0,
            });
          }
          break;
        }

        case 'reset_session': {
          const session = sessionManager.get(msg.sessionId);
          if (!session) {
            send(socket, {
              type: 'result',
              sessionId: msg.sessionId,
              success: false,
              error: 'Session not found',
              seq: 0,
            });
            return;
          }

          const reset = session.reset();
          if (!reset) {
            send(socket, {
              type: 'result',
              sessionId: msg.sessionId,
              success: false,
              error: 'Session is not in error state',
              seq: 0,
            });
          }

          send(socket, {
            type: 'session_state',
            sessionId: msg.sessionId,
            status: session.status,
            messageCount: session.messageCount,
          });
          break;
        }
      }
    });
  });
}
