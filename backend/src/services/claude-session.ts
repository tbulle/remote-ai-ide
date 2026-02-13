import { query } from '@anthropic-ai/claude-code';
import type { SDKMessage, PermissionResult, PermissionUpdate } from '@anthropic-ai/claude-code';
import { v4 as uuidv4 } from 'uuid';

interface MessageEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  seq: number;
}

export class ClaudeSession {
  readonly id: string;
  readonly projectPath: string;
  private messages: MessageEntry[] = [];
  private seqCounter = 0;
  private abortController: AbortController | null = null;
  private pendingPermissions = new Map<
    string,
    { resolve: (result: PermissionResult) => void }
  >();
  status: 'ready' | 'busy' | 'error' = 'ready';
  lastActivity: number = Date.now();

  constructor(id: string, projectPath: string) {
    this.id = id;
    this.projectPath = projectPath;
  }

  get messageCount(): number {
    return this.messages.length;
  }

  getMessagesSince(seq: number): MessageEntry[] {
    return this.messages.filter((m) => m.seq > seq);
  }

  nextSeq(): number {
    return ++this.seqCounter;
  }

  async sendMessage(
    text: string,
    onChunk: (content: string, seq: number) => void,
    onPermissionRequest: (req: {
      requestId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
      description: string;
    }) => void,
    onComplete: (fullContent: string, seq: number) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    this.status = 'busy';
    this.lastActivity = Date.now();
    this.abortController = new AbortController();

    const userSeq = this.nextSeq();
    this.addMessage('user', text, userSeq);

    try {
      const conversation = query({
        prompt: text,
        options: {
          cwd: this.projectPath,
          allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
          abortController: this.abortController,
          maxTurns: 30,
          canUseTool: async (
            toolName: string,
            toolInput: Record<string, unknown>,
            options: { signal: AbortSignal; suggestions?: PermissionUpdate[] },
          ): Promise<PermissionResult> => {
            const requestId = uuidv4();
            const description = `Tool: ${toolName}`;

            onPermissionRequest({ requestId, toolName, toolInput, description });

            return new Promise<PermissionResult>((resolve) => {
              this.pendingPermissions.set(requestId, { resolve });
            });
          },
        },
      });

      let fullContent = '';

      for await (const message of conversation) {
        this.lastActivity = Date.now();

        if (message.type === 'assistant') {
          const blocks = message.message.content;
          for (const block of blocks) {
            if (block.type === 'text') {
              const seq = this.nextSeq();
              onChunk(block.text, seq);
              fullContent += block.text;
            }
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'success' && 'result' in message) {
            fullContent = message.result || fullContent;
          }
        }
      }

      const assistantSeq = this.nextSeq();
      this.addMessage('assistant', fullContent, assistantSeq);
      onComplete(fullContent, assistantSeq);
    } catch (err: unknown) {
      this.status = 'error';
      onError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (this.status !== 'error') {
        this.status = 'ready';
      }
      this.abortController = null;
    }
  }

  reset(): boolean {
    if (this.status !== 'error') return false;
    this.status = 'ready';
    this.lastActivity = Date.now();
    return true;
  }

  resolvePermission(requestId: string, allowed: boolean): void {
    const pending = this.pendingPermissions.get(requestId);
    if (pending) {
      if (allowed) {
        pending.resolve({ behavior: 'allow', updatedInput: {} });
      } else {
        pending.resolve({
          behavior: 'deny',
          message: 'User denied permission',
        });
      }
      this.pendingPermissions.delete(requestId);
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private addMessage(
    role: 'user' | 'assistant',
    content: string,
    seq: number,
  ): void {
    this.messages.push({ role, content, timestamp: Date.now(), seq });
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-500);
    }
  }
}
