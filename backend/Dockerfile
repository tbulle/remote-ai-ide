# Build context should be project root so shared/ is available.
FROM node:22-alpine AS build
WORKDIR /app

COPY shared ./shared
COPY backend ./backend

WORKDIR /app/backend
RUN npm ci
RUN npm run build
# Keep only production dependencies for the runtime image.
RUN npm prune --omit=dev

FROM node:22-alpine AS run
WORKDIR /app/backend

# Install system dependencies needed by Claude Code sessions
RUN apk add --no-cache bash git openssh sshpass curl \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl && mv kubectl /usr/local/bin/

# Install Claude CLI (MCP tools installed dynamically at startup)
RUN npm install -g @anthropic-ai/claude-code

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3002
CMD ["/entrypoint.sh"]
