import type { FastifyInstance } from 'fastify';

export async function voiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/voice/transcribe', async (_request, reply) => {
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
