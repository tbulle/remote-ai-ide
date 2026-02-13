import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { appConfig } from './config/index.js';
import { authHook } from './services/auth.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/sessions.js';
import { projectRoutes } from './routes/projects.js';
import { voiceRoutes } from './routes/voice.js';
import { wsHandler } from './ws/handler.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: appConfig.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check (unauthenticated)
  await fastify.register(healthRoutes);

  // Auth hook for /api/* routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      await authHook(request, reply);
    }
  });

  // Authenticated routes
  await fastify.register(sessionRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(voiceRoutes);

  // WebSocket (auth via query param)
  await fastify.register(wsHandler);

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error);
    reply.code(error.statusCode ?? 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  return fastify;
}
