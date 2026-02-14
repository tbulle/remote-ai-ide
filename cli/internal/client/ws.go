package client

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type WSClient struct {
	url      string
	conn     *websocket.Conn
	mu       sync.Mutex
	Messages chan []byte
	Done     chan struct{}
	closed   bool
}

func NewWSClient(baseURL, token string) (*WSClient, error) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, err
	}
	scheme := "ws"
	if u.Scheme == "https" {
		scheme = "wss"
	}
	wsURL := fmt.Sprintf("%s://%s/ws?token=%s", scheme, u.Host, url.QueryEscape(token))

	ws := &WSClient{
		url:      wsURL,
		Messages: make(chan []byte, 100),
		Done:     make(chan struct{}),
	}
	if err := ws.connect(); err != nil {
		return nil, err
	}
	go ws.readLoop()
	return ws, nil
}

func (ws *WSClient) connect() error {
	conn, _, err := websocket.DefaultDialer.Dial(ws.url, nil)
	if err != nil {
		return fmt.Errorf("ws connect: %w", err)
	}
	ws.mu.Lock()
	ws.conn = conn
	ws.mu.Unlock()
	return nil
}

func (ws *WSClient) readLoop() {
	defer close(ws.Done)
	for {
		ws.mu.Lock()
		conn := ws.conn
		ws.mu.Unlock()
		if conn == nil {
			return
		}
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if ws.closed {
				return
			}
			log.Printf("ws read error: %v", err)
			if ws.reconnect() {
				continue
			}
			return
		}
		ws.Messages <- msg
	}
}

func (ws *WSClient) reconnect() bool {
	delay := time.Second
	for attempt := 0; attempt < 10; attempt++ {
		log.Printf("reconnecting (attempt %d)...", attempt+1)
		time.Sleep(delay)
		if err := ws.connect(); err == nil {
			log.Println("reconnected")
			return true
		}
		delay *= 2
		if delay > 30*time.Second {
			delay = 30 * time.Second
		}
	}
	return false
}

func (ws *WSClient) Send(v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if ws.conn == nil {
		return fmt.Errorf("not connected")
	}
	return ws.conn.WriteMessage(websocket.TextMessage, data)
}

func (ws *WSClient) Close() {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.closed = true
	if ws.conn != nil {
		ws.conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		ws.conn.Close()
		ws.conn = nil
	}
}

func ParseServerMessage(data []byte) (string, interface{}, error) {
	var base ServerMessage
	if err := json.Unmarshal(data, &base); err != nil {
		return "", nil, err
	}
	switch base.Type {
	case "assistant_chunk":
		var m AssistantChunk
		err := json.Unmarshal(data, &m)
		return base.Type, &m, err
	case "assistant_message":
		var m AssistantMessageMsg
		err := json.Unmarshal(data, &m)
		return base.Type, &m, err
	case "permission_request":
		var m PermissionRequest
		err := json.Unmarshal(data, &m)
		return base.Type, &m, err
	case "session_state":
		var m SessionState
		err := json.Unmarshal(data, &m)
		return base.Type, &m, err
	case "result":
		var m ResultMessage
		err := json.Unmarshal(data, &m)
		return base.Type, &m, err
	default:
		return base.Type, nil, fmt.Errorf("unknown message type: %s", base.Type)
	}
}

// BaseURL extracts the original base URL (for display)
func (ws *WSClient) BaseURL() string {
	u, err := url.Parse(ws.url)
	if err != nil {
		return ws.url
	}
	scheme := "http"
	if strings.HasPrefix(u.Scheme, "wss") {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, u.Host)
}
