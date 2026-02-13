# Remote AI IDE

<!-- MAX 50 LINES. Detailed docs go in ARCHITECTURE.md, read on demand. -->

Lightweight mobile client for Claude Code. Persistent sessions, WebSocket streaming, voice input.

## Tech Stack
- **Backend**: Fastify 5 + TypeScript, @anthropic-ai/claude-code SDK, @fastify/websocket
- **Frontend**: React 19 + Vite 6 + Tailwind v4, PWA (vite-plugin-pwa)
- **Voice**: Whisper (local CLI) for speech-to-text
- **Deploy**: systemd (dev), k8s (production)

## Entry Points
- Backend: `backend/src/index.ts`
- Frontend: `frontend/src/main.tsx`
- Config: `backend/src/config/index.ts`

## Commands
```bash
# Backend
cd backend && npm run dev          # Dev server on :3002
cd backend && npm run build        # TypeScript compile

# Frontend
cd frontend && npm run dev         # Vite dev on :5174
cd frontend && npm run build       # Production build
```

## Architecture
```
[Mobile PWA] <-- WebSocket --> [Fastify :3002] <-- SDK --> [Claude Code]
                                     |
                                [Whisper STT]
```

- Single WebSocket multiplexed by sessionId
- Permission relay: SDK callback -> WS -> client -> WS -> resolve
- Message ring buffer (500 msgs) with sequence numbers for reconnect replay
- Bearer token auth (REST header, WS query param)

## Key Files
- `backend/src/services/claude-session.ts` -- SDK wrapper, permission relay
- `backend/src/ws/handler.ts` -- WebSocket message routing
- `frontend/src/api/ws.ts` -- WebSocket client with auto-reconnect
- `frontend/src/hooks/useSession.ts` -- Session state + streaming

## Current Goals
- Phase 1-2: MVP backend + frontend (in progress)
- Phase 3: Integration + reconnect replay
- Phase 4: Voice input (Whisper)
- Phase 5: Docker + k8s deployment
