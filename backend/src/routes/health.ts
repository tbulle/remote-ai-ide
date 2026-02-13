import type { FastifyInstance } from 'fastify';
import { sessionManager } from '../services/session-manager.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', { config: { rateLimit: false } }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeSessions: sessionManager.list().length,
    };
  });
}
