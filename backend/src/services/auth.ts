import type { FastifyRequest, FastifyReply } from 'fastify';
import { appConfig } from '../config/index.js';

export function validateToken(token: string): boolean {
  if (appConfig.authTokens.length === 0) {
    return true;
  }
  return appConfig.authTokens.includes(token);
}

export async function authHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!validateToken(token)) {
    reply.code(403).send({ error: 'Invalid token' });
    return;
  }
}

export function extractWsToken(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    return parsed.searchParams.get('token');
  } catch {
    return null;
  }
}
