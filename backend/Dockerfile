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

# Install Claude CLI required by @anthropic-ai/claude-code
RUN npm install -g @anthropic-ai/claude-code

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules

EXPOSE 3002
CMD ["node", "dist/backend/src/index.js"]
