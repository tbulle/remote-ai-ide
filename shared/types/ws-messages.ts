// Client -> Server messages

export interface UserMessage {
  type: 'user_message';
  sessionId: string;
  text: string;
  seq?: number;
}

export interface PermissionResponse {
  type: 'permission_response';
  sessionId: string;
  requestId: string;
  allowed: boolean;
}

export interface InterruptMessage {
  type: 'interrupt';
  sessionId: string;
}

export interface SwitchSession {
  type: 'switch_session';
  sessionId: string;
}

export interface ResetSession {
  type: 'reset_session';
  sessionId: string;
}

export type ClientMessage =
  | UserMessage
  | PermissionResponse
  | InterruptMessage
  | SwitchSession
  | ResetSession;

// Server -> Client messages

export interface AssistantChunk {
  type: 'assistant_chunk';
  sessionId: string;
  content: string;
  seq: number;
}

export interface AssistantMessage {
  type: 'assistant_message';
  sessionId: string;
  content: string;
  seq: number;
}

export interface PermissionRequest {
  type: 'permission_request';
  sessionId: string;
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

export interface ToolEvent {
  type: 'tool_event';
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  seq: number;
}

export interface SessionState {
  type: 'session_state';
  sessionId: string;
  status: 'ready' | 'busy' | 'error';
  messageCount: number;
}

export interface ResultMessage {
  type: 'result';
  sessionId: string;
  success: boolean;
  error?: string;
  seq: number;
}

export type ServerMessage =
  | AssistantChunk
  | AssistantMessage
  | PermissionRequest
  | ToolEvent
  | SessionState
  | ResultMessage;
