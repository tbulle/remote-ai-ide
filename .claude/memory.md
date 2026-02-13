# Project Memory

> This file maintains context between Claude sessions. Updated automatically.

## Current Focus
- Working on: MVP complete, ready for deployment
- Branch: main
- Status: ready for smoke test on device + k8s deploy

## Blockers & Open Questions
- Voice input (Whisper) deferred to Phase 4
- Session persistence (DB) deferred -- nice-to-have, not MVP
- PWA manifest has empty icons array -- needs icon generation

## Recent Context

### 2026-02-13
- Full project review (business analyst + architect)
- Completed all 10 MVP tasks: build, .env.example, shared types, reconnect replay, error recovery, Dockerfiles, k8s manifests, rate limiting
- Backend smoke tested: health, sessions CRUD, projects, WebSocket streaming, permission relay all working
- Frontend smoke tested with Playwright: login, session creation, WS connection, message send/receive all passing
- Fixed 4 bugs:
  - Auth: `authHook` rejected requests without header even when AUTH_TOKENS empty
  - Status timing: `onComplete` callback fired while session still `busy`
  - Frontend: `ProjectSelector` read `result.sessionId` instead of `result.id`
  - Frontend: WebSocket URL missing `/ws` path segment

## Key Information
- Single-user tool (just owner accessing own server)
- Deploy target: k3s cluster at lifetracker.ddns.net (NodePort 30020 backend, 30021 frontend)
- Container registry: ghcr.io/tbulle/
- Backend port: 3002, Frontend dev port: 5174
- AUTH_TOKENS empty = no auth required (single-user mode)
- Shared types at shared/types/ws-messages.ts, imported via @shared/* path alias
- Backend build output: dist/backend/src/index.js (rootDir is ..)
- Dockerfiles use project root as build context (for shared/ types)

---
*Last updated: 2026-02-13*
