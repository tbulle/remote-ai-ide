import type { FastifyInstance } from 'fastify';
import { readdir, stat, access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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

  interface CreateProjectBody {
    name: string;
  }

  fastify.post('/api/projects', async (request, reply) => {
    const body = request.body as CreateProjectBody | undefined;
    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!rawName) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const sanitizedName = rawName.replace(/[^A-Za-z0-9._-]/g, '');

    if (!sanitizedName) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const home = homedir();
    const projectPath = join(home, sanitizedName);

    if (await exists(projectPath)) {
      return reply.status(409).send({ error: 'Project already exists' });
    }

    try {
      await mkdir(projectPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EEXIST') {
        return reply.status(409).send({ error: 'Project already exists' });
      }
      throw error;
    }

    await execFileAsync('git', ['init'], { cwd: projectPath });

    return reply.status(201).send({ name: sanitizedName, path: projectPath });
  });
}
