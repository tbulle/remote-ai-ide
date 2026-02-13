import { v4 as uuidv4 } from 'uuid';
import { ClaudeSession } from './claude-session.js';
import { appConfig } from '../config/index.js';

export class SessionManager {
  private sessions = new Map<string, ClaudeSession>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  create(projectPath: string): ClaudeSession {
    if (this.sessions.size >= appConfig.maxSessions) {
      throw new Error(`Max sessions (${appConfig.maxSessions}) reached`);
    }

    const id = uuidv4();
    const session = new ClaudeSession(id, projectPath);
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): ClaudeSession | undefined {
    return this.sessions.get(id);
  }

  delete(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.abort();
      this.sessions.delete(id);
    }
  }

  list(): Array<{
    id: string;
    projectPath: string;
    status: string;
    messageCount: number;
    lastActivity: number;
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      projectPath: s.projectPath,
      status: s.status,
      messageCount: s.messageCount,
      lastActivity: s.lastActivity,
    }));
  }

  startCleanup(intervalMs: number, timeoutMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity > timeoutMs && session.status !== 'busy') {
          session.abort();
          this.sessions.delete(id);
        }
      }
    }, intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const sessionManager = new SessionManager();
