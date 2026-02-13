import type { FastifyInstance } from 'fastify';
import { sessionManager } from '../services/session-manager.js';

interface CreateSessionBody {
  projectPath: string;
}

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CreateSessionBody }>(
    '/api/sessions',
    async (request, reply) => {
      const { projectPath } = request.body;
      if (!projectPath || typeof projectPath !== 'string') {
        return reply.code(400).send({ error: 'projectPath is required' });
      }

      try {
        const session = sessionManager.create(projectPath);
        return reply.code(201).send({
          id: session.id,
          projectPath: session.projectPath,
          status: session.status,
          messageCount: session.messageCount,
        });
      } catch (err: unknown) {
        return reply.code(503).send({
          error: err instanceof Error ? err.message : 'Failed to create session',
        });
      }
    },
  );

  fastify.get('/api/sessions', async () => {
    return sessionManager.list();
  });

  fastify.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    '/api/sessions/:id',
    async (request, reply) => {
      const session = sessionManager.get(request.params.id);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const since = parseInt(request.query.since || '0', 10);
      return {
        id: session.id,
        projectPath: session.projectPath,
        status: session.status,
        messageCount: session.messageCount,
        lastActivity: session.lastActivity,
        messages: session.getMessagesSince(since),
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/sessions/:id',
    async (request, reply) => {
      const session = sessionManager.get(request.params.id);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      sessionManager.delete(request.params.id);
      return reply.code(204).send();
    },
  );
}
