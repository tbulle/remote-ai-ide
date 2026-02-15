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

### MCP Server Configuration

MCP servers are configured in Claude's settings file (`~/.claude/settings.json`) on the host. The backend image ships with only `claude-code` pre-installed — additional tools are installed dynamically at container startup.

**Pre-installing packages** (recommended for fast cold starts):

Create these files on the host (mounted via `/root`):

`~/.claude/mcp-packages.txt` — npm packages, one per line:
```
@openai/codex
@modelcontextprotocol/server-github
```

`~/.claude/apk-packages.txt` — Alpine system packages, one per line:
```
github-cli
```

On pod restart, the entrypoint script installs these before starting the backend. No image rebuild needed.

**Alternative**: Use `npx -y <package>` in your MCP server commands. This auto-downloads on first use but has a slower cold start per session.

CI/CD via GitHub Actions (.github/workflows/deploy.yml) — builds images, pushes to GHCR, deploys to VPS via SSH.

Required GitHub secrets: VPS_HOST, VPS_USER, VPS_PASSWORD, GHCR_PAT

### Claude Code Settings (`~/.claude/settings.json`)

Each AI session inherits Claude Code's global settings from the host. Place `settings.json` at `~/.claude/settings.json` (mounted into the pod via the `/root` hostPath volume).

The settings file controls three areas: **permissions**, **hooks**, and **MCP servers**.

#### Permissions

Permissions are split into `allow` (auto-approved), `deny` (blocked), and `ask` (prompt user via WebSocket relay). Pattern syntax: `Tool(glob)`.

```jsonc
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read", "Grep", "Glob",
      // Build and test commands
      "Bash(npm run build *)", "Bash(npm run test *)", "Bash(dotnet build *)", "Bash(dotnet test *)",
      // Git read-only
      "Bash(git status *)", "Bash(git diff *)", "Bash(git log *)", "Bash(git show *)",
      "Bash(git branch *)", "Bash(git rev-parse *)", "Bash(git remote *)",
      // Server management (SSH into other hosts, k8s)
      "Bash(ssh *)", "Bash(sshpass *)", "Bash(kubectl *)",
      // MCP tools
      "mcp__server-github__*", "mcp__codex-delegate__*"
    ],
    "deny": [
      "Bash(rm -rf *)", "Bash(git push --force *)", "Bash(git reset --hard *)",
      "Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)", "Read(~/.ssh/**)"
    ],
    "ask": [
      "Bash(git push *)", "Bash(git commit *)", "Bash(git add *)",
      "Bash(npm install *)", "Bash(pnpm install *)"
    ]
  }
}
```

`defaultMode: "acceptEdits"` auto-approves file edits (Edit/Write tools) without user confirmation. Destructive operations (force push, hard reset, rm -rf) and sensitive file reads are always denied.

#### Hooks

Hooks are shell commands triggered by session lifecycle events. They run inside the container but have access to the host filesystem via the `/root` mount.

| Hook | Purpose |
|---|---|
| `PreToolUse` (Bash) | Blocks `npm run dev` (must run in tmux). Suggests tmux for long-running commands. |
| `PreToolUse` (Write) | Blocks creation of unnecessary `.md`/`.txt` files (allows README, CLAUDE.md, etc.) |
| `PostToolUse` (Edit) | Auto-formats with Prettier, runs `tsc --noEmit` for type errors, warns on `console.log` |
| `PostToolUse` (Bash) | Extracts PR URL from `gh pr create` output |
| `SessionStart` | Runs `~/.claude/scripts/hooks/session-start.js` |
| `SessionEnd` | Runs `session-end.js` and `evaluate-session.js` |
| `Stop` | Checks for leftover `console.log` in uncommitted changes |
| `PreCompact` | Runs `~/.claude/scripts/hooks/pre-compact.js` |

Hook scripts must exist on the host at `~/.claude/scripts/hooks/`:
- `session-start.js` — Session initialization
- `session-end.js` — Session cleanup
- `evaluate-session.js` — Session quality evaluation
- `pre-compact.js` — Pre-compaction context preservation
- `suggest-compact.js` — Suggests compaction at logical breakpoints

Optional project-level hooks (in `.claude-shared/hooks/`) are loaded if present.

#### MCP Servers

MCP servers provide external tool integrations to AI sessions. Configured in the same `settings.json`:

```jsonc
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<pat>" }
    },
    "codex-delegate": {
      "command": "/usr/bin/codex",
      "args": ["mcp-server"]
    },
    "kanbn": {
      "command": "node",
      "args": ["/root/.claude/mcp-servers/kanbn/dist/index.js"],
      "env": {
        "KANBN_BASE_URL": "http://lifetracker.ddns.net:30003",
        "KANBN_EMAIL": "<email>",
        "KANBN_PASSWORD": "<password>"
      }
    }
  }
}
```

- **GitHub MCP**: Provides `mcp__server-github__*` tools (issues, PRs, code search). Requires a GitHub PAT.
- **Codex delegate**: Provides `mcp__codex-delegate__codex` for delegating tasks to OpenAI Codex. Requires `/usr/bin/codex` (installed globally via `npm install -g @openai/codex`; listed in `~/.claude/apk-packages.txt` or pre-installed in the image).
- **Kan.bn**: Kanban board integration. Requires a running Kan.bn instance.

#### SSH/kubectl Access

The backend image includes `sshpass`, `openssh`, and `kubectl` so AI sessions can manage remote servers and Kubernetes clusters. SSH credentials are injected as environment variables from k8s Secrets:

```yaml
# k8s/secret.yaml
stringData:
  SSH_HOST_MYSERVER: "myserver.example.com"
  SSH_USER_MYSERVER: "root"
  SSH_PASSWORD_MYSERVER: "password"
```

Sessions can then SSH into servers (`sshpass -p $SSH_PASSWORD ssh $SSH_USER@$SSH_HOST`) and run kubectl commands on remote clusters.

## Tech Stack
- **Backend**: Fastify 5, TypeScript, WebSocket, rate limiting
- **Frontend**: React 19, Vite 6, Tailwind v4, PWA (vite-plugin-pwa)
- **CLI**: Go, Bubble Tea, Cobra, gorilla/websocket
- **Voice**: Whisper STT (planned)
- **Deploy**: Docker, k8s (k3s), GitHub Actions

## License
MIT

---
