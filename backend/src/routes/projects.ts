import type { FastifyInstance } from 'fastify';
import { readdir, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findGitProjects(
  baseDir: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<string[]> {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const fullPath = join(baseDir, entry.name);

      if (await exists(join(fullPath, '.git'))) {
        results.push(fullPath);
      } else if (currentDepth < maxDepth) {
        const nested = await findGitProjects(fullPath, maxDepth, currentDepth + 1);
        results.push(...nested);
      }
    }
  } catch {
    // Ignore permission errors
  }

  return results;
}

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/projects', async () => {
    const home = homedir();
    const projects = await findGitProjects(home, 2);
    return projects.map((p) => ({
      path: p,
      name: p.replace(home + '/', ''),
    }));
  });
}
