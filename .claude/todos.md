# Tasks

## In Progress
<!-- Tasks currently being worked on -->

## Up Next
<!-- Prioritized backlog -->
- [ ] Deploy to k8s: build Docker images, push to GHCR, `kubectl apply -k k8s/`
- [ ] Test on mobile device (real PWA experience)
- [ ] Generate PWA icons for manifest.json

## Completed

### 2026-02-13
- [x] Build backend and frontend, fix TypeScript errors (zero errors)
- [x] Create .env.example files for backend and frontend
- [x] Smoke test backend (health, sessions, projects, WS streaming, permissions)
- [x] Smoke test frontend with Playwright (login, session create, WS, chat)
- [x] Fix auth bypass when AUTH_TOKENS empty
- [x] Fix session status timing (ready before onComplete)
- [x] Fix ProjectSelector session ID mapping (id vs sessionId)
- [x] Fix WebSocket URL missing /ws path
- [x] Extract shared WS message types to shared/types/
- [x] Implement reconnect replay on frontend client
- [x] Add session error recovery (reset from error state)
- [x] Create Dockerfiles for backend and frontend
- [x] Create k8s manifests (deployments, services, configmap, secret, kustomization)
- [x] Add rate limiting to REST (100/min) and WebSocket (30 msg/min)

## Backlog
<!-- Lower priority items -->
- [ ] Session persistence with SQLite/PostgreSQL (survive restarts)
- [ ] Structured logging with pino request IDs
- [ ] CI/CD pipeline (GitHub Actions: build + push images)
- [ ] Add test coverage (unit + integration)

## Ideas / Someday
<!-- Things to consider later -->
- [ ] Voice input with Whisper (Phase 4)
- [ ] Multi-session WebSocket multiplexing improvements
- [ ] Horizontal scaling (shared session store)
