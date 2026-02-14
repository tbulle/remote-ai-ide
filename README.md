# Remote AI IDE

A lightweight remote client for AI-assisted development. Connect from any device via the PWA or terminal CLI. Features persistent sessions, WebSocket streaming, permission relay, and voice input.

## Features
- PWA mobile client
- Go terminal client
- WebSocket streaming with auto-reconnect
- Permission relay for tool approvals
- Multi-server profile support
- Session management
- Rate limiting
- k8s deployment ready

## Architecture
```
[Mobile PWA] <-- WebSocket --> [Fastify :3002] <-- SDK --> [AI Backend]
[Terminal CLI] <---/                  |
                                [Whisper STT]
```

## Authentication

The backend requires two types of authentication:

1. **Client auth** (`AUTH_TOKENS`) — Bearer tokens for PWA/CLI connections. Comma-separated list. Empty = no auth required.
2. **AI auth** — The backend uses the Claude Code SDK which needs valid OAuth credentials at `~/.claude/.credentials.json`. Run `claude login` on the host to generate these, then mount them into the container.

For k8s, create a secret from the credentials file:
```bash
kubectl create secret generic claude-credentials -n <namespace> \
  --from-file=.credentials.json=$HOME/.claude/.credentials.json

# Then add a volume mount to the backend deployment:
# mountPath: /root/.claude/.credentials.json
# subPath: .credentials.json
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env  # Edit with your settings
npm install
npm run dev            # Dev server on :3002
```

Environment variables:
- PORT (default: 3002)
- HOST (default: 0.0.0.0)
- NODE_ENV (default: development)
- AUTH_TOKENS — comma-separated bearer tokens (empty = no auth)
- MAX_SESSIONS (default: 10)
- SESSION_TIMEOUT_MS (default: 3600000)
- WHISPER_MODEL (default: base)
- DEFAULT_CWD — working directory for AI sessions (default: $HOME)

### CLI
Requires Go 1.24+

```bash
cd cli
go build -o remote-ai-ide-cli .

# Configure servers
./remote-ai-ide-cli servers add --name local --url http://localhost:3002 --token yourtoken

# Connect
./remote-ai-ide-cli connect --project /path/to/project
```

Config stored at ~/.remote-ai-ide.yaml

Commands:
- `connect` — Start a TUI session (--project flag, defaults to cwd)
- `servers list` — List configured servers
- `servers add` — Add a server profile (--name, --url, --token)
- `servers remove` — Remove a server profile
- `servers test` — Test server connectivity

### Frontend (PWA)
```bash
cd frontend
npm install
npm run dev     # Dev server on :5174
npm run build   # Production build (served by nginx)
```

Build args for production: VITE_API_URL, VITE_WS_URL

## Distribution

### Docker Images
Backend and frontend are published to GitHub Container Registry on every push to main:

```
ghcr.io/tbulle/remote-ai-ide-backend:latest
ghcr.io/tbulle/remote-ai-ide-frontend:latest
```

Both use multi-stage builds (node:22-alpine for build, node:22-alpine/nginx:alpine for runtime).

Pull images:
```bash
echo $GHCR_PAT | docker login ghcr.io -u tbulle --password-stdin
docker pull ghcr.io/tbulle/remote-ai-ide-backend:latest
docker pull ghcr.io/tbulle/remote-ai-ide-frontend:latest
```

Run locally with Docker:
```bash
# Backend
docker run -p 3002:3002 \
  -e AUTH_TOKENS=yourtoken \
  ghcr.io/tbulle/remote-ai-ide-backend:latest

# Frontend
docker run -p 8080:80 \
  ghcr.io/tbulle/remote-ai-ide-frontend:latest
```

### CLI Binary
Build for your platform:
```bash
cd cli
go build -o remote-ai-ide-cli .
```

Cross-compile:
```bash
GOOS=linux GOARCH=amd64 go build -o remote-ai-ide-cli-linux .
GOOS=darwin GOARCH=arm64 go build -o remote-ai-ide-cli-darwin .
GOOS=windows GOARCH=amd64 go build -o remote-ai-ide-cli.exe .
```

## Deployment (Kubernetes)

k8s manifests are in `k8s/` using Kustomize:

```bash
# Apply all resources
kubectl apply -k k8s/

# Resources created:
# - ConfigMap: remote-ai-ide-config
# - Secret: remote-ai-ide-secrets (set AUTH_TOKENS before applying)
# - Deployment: remote-ai-ide-backend (port 3002, NodePort 30020)
# - Deployment: remote-ai-ide-frontend (port 80, NodePort 30021)
```

The backend pod mounts the host's `/root` directory at `/root` inside the container via a `hostPath` volume. This gives AI sessions access to git repos, SSH keys, git config, and Claude settings on the host. The container image includes `bash`, `git`, and `openssh` for full Claude Code functionality.

CI/CD via GitHub Actions (.github/workflows/deploy.yml) — builds images, pushes to GHCR, deploys to VPS via SSH.

Required GitHub secrets: VPS_HOST, VPS_USER, VPS_PASSWORD, GHCR_PAT

## Tech Stack
- **Backend**: Fastify 5, TypeScript, WebSocket, rate limiting
- **Frontend**: React 19, Vite 6, Tailwind v4, PWA (vite-plugin-pwa)
- **CLI**: Go, Bubble Tea, Cobra, gorilla/websocket
- **Voice**: Whisper STT (planned)
- **Deploy**: Docker, k8s (k3s), GitHub Actions

## License
MIT

---
