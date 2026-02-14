package client

import "encoding/json"

// Client -> Server
type UserMessage struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	Text      string `json:"text"`
	Seq       int    `json:"seq,omitempty"`
}

type PermissionResponseMsg struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	RequestID string `json:"requestId"`
	Allowed   bool   `json:"allowed"`
}

type InterruptMessage struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
}

type SwitchSessionMsg struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
}

type ResetSessionMsg struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
}

func NewUserMessage(sessionID, text string) UserMessage {
	return UserMessage{Type: "user_message", SessionID: sessionID, Text: text}
}

func NewPermissionResponse(sessionID, requestID string, allowed bool) PermissionResponseMsg {
	return PermissionResponseMsg{Type: "permission_response", SessionID: sessionID, RequestID: requestID, Allowed: allowed}
}

func NewInterrupt(sessionID string) InterruptMessage {
	return InterruptMessage{Type: "interrupt", SessionID: sessionID}
}

func NewResetSession(sessionID string) ResetSessionMsg {
	return ResetSessionMsg{Type: "reset_session", SessionID: sessionID}
}

// Server -> Client
type AssistantChunk struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	Content   string `json:"content"`
	Seq       int    `json:"seq"`
}

type AssistantMessageMsg struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	Content   string `json:"content"`
	Seq       int    `json:"seq"`
}

type PermissionRequest struct {
	Type        string          `json:"type"`
	SessionID   string          `json:"sessionId"`
	RequestID   string          `json:"requestId"`
	ToolName    string          `json:"toolName"`
	ToolInput   json.RawMessage `json:"toolInput"`
	Description string          `json:"description"`
}

type SessionState struct {
	Type         string `json:"type"`
	SessionID    string `json:"sessionId"`
	Status       string `json:"status"`
	MessageCount int    `json:"messageCount"`
}

type ResultMessage struct {
	Type      string `json:"type"`
	SessionID string `json:"sessionId"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
	Seq       int    `json:"seq"`
}

type ServerMessage struct {
	Type string `json:"type"`
}
