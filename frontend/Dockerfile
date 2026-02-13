# Build context should be project root so shared/ is available.
FROM node:22-alpine AS build
WORKDIR /app

COPY shared ./shared
COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm ci

ARG VITE_API_URL=http://localhost:3002
ARG VITE_WS_URL=ws://localhost:3002
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

FROM nginx:alpine AS serve

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
