package tui

import (
	"encoding/json"
	"strings"

	"github.com/arvid/remote-ai-ide/cli/internal/client"
	"github.com/charmbracelet/bubbles/textarea"
	tea "github.com/charmbracelet/bubbletea"
)

// Tea messages wrapping WS events
type wsMsg struct{ data []byte }
type wsDisconnect struct{}
type errMsg struct{ err error }

func listenWS(ws *client.WSClient) tea.Cmd {
	return func() tea.Msg {
		select {
		case data, ok := <-ws.Messages:
			if !ok {
				return wsDisconnect{}
			}
			return wsMsg{data: data}
		case <-ws.Done:
			return wsDisconnect{}
		}
	}
}

type Model struct {
	ws        *client.WSClient
	sessionID string
	server    string

	messages  []chatMessage
	streamBuf string
	connected bool
	status    string // ready, busy, error

	permReq *client.PermissionRequest

	input    textarea.Model
	width    int
	height   int
	quitting bool
}

func NewModel(ws *client.WSClient, sessionID, serverName string) Model {
	ti := textarea.New()
	ti.Placeholder = "Type a message..."
	ti.Focus()
	ti.SetHeight(3)
	ti.ShowLineNumbers = false
	ti.KeyMap.InsertNewline.SetEnabled(false)

	return Model{
		ws:        ws,
		sessionID: sessionID,
		server:    serverName,
		connected: true,
		status:    "ready",
		input:     ti,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(textarea.Blink, listenWS(m.ws))
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.input.SetWidth(msg.Width - 4)
		return m, nil

	case tea.KeyMsg:
		if m.permReq != nil {
			return m.handlePermissionKey(msg)
		}
		return m.handleKey(msg)

	case wsMsg:
		return m.handleWS(msg.data)

	case wsDisconnect:
		m.connected = false
		return m, nil

	case errMsg:
		m.messages = append(m.messages, chatMessage{Role: "error", Content: msg.err.Error()})
		return m, listenWS(m.ws)
	}

	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyCtrlC:
		if m.status == "busy" {
			m.ws.Send(client.NewInterrupt(m.sessionID))
			return m, nil
		}
		m.quitting = true
		return m, tea.Quit

	case tea.KeyCtrlD:
		m.quitting = true
		return m, tea.Quit

	case tea.KeyEnter:
		text := strings.TrimSpace(m.input.Value())
		if text == "" {
			return m, nil
		}
		m.input.Reset()

		// Check slash commands
		cmd := parseSlashCommand(text)
		switch cmd {
		case cmdQuit:
			m.quitting = true
			return m, tea.Quit
		case cmdReset:
			m.ws.Send(client.NewResetSession(m.sessionID))
			m.messages = append(m.messages, chatMessage{Role: "error", Content: "Session reset requested"})
			return m, nil
		case cmdHelp:
			m.messages = append(m.messages, chatMessage{Role: "assistant", Content: helpText()})
			return m, nil
		}

		// Regular message
		m.messages = append(m.messages, chatMessage{Role: "user", Content: text})
		m.ws.Send(client.NewUserMessage(m.sessionID, text))
		return m, nil
	}

	var teaCmd tea.Cmd
	m.input, teaCmd = m.input.Update(msg)
	return m, teaCmd
}

func (m Model) handlePermissionKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y":
		m.ws.Send(client.NewPermissionResponse(m.sessionID, m.permReq.RequestID, true))
		m.messages = append(m.messages, chatMessage{
			Role:    "assistant",
			Content: "✓ Allowed: " + m.permReq.ToolName,
		})
		m.permReq = nil
	case "n", "N":
		m.ws.Send(client.NewPermissionResponse(m.sessionID, m.permReq.RequestID, false))
		m.messages = append(m.messages, chatMessage{
			Role:    "error",
			Content: "✗ Denied: " + m.permReq.ToolName,
		})
		m.permReq = nil
	}
	return m, nil
}

func (m Model) handleWS(data []byte) (tea.Model, tea.Cmd) {
	msgType, parsed, err := client.ParseServerMessage(data)
	if err != nil {
		m.messages = append(m.messages, chatMessage{Role: "error", Content: err.Error()})
		return m, listenWS(m.ws)
	}

	switch msgType {
	case "assistant_chunk":
		chunk := parsed.(*client.AssistantChunk)
		m.streamBuf += chunk.Content

	case "assistant_message":
		msg := parsed.(*client.AssistantMessageMsg)
		content := msg.Content
		if content == "" {
			content = m.streamBuf
		}
		m.messages = append(m.messages, chatMessage{Role: "assistant", Content: content})
		m.streamBuf = ""

	case "permission_request":
		req := parsed.(*client.PermissionRequest)
		m.permReq = req

	case "session_state":
		state := parsed.(*client.SessionState)
		m.status = state.Status

	case "result":
		result := parsed.(*client.ResultMessage)
		if !result.Success && result.Error != "" {
			m.messages = append(m.messages, chatMessage{Role: "error", Content: result.Error})
		}
	}

	return m, listenWS(m.ws)
}

func (m Model) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	var b strings.Builder

	// Status bar at top
	b.WriteString(renderStatusBar(m.connected, m.status, m.server, m.width))
	b.WriteString("\n\n")

	// Chat area
	chatContent := renderChat(m.messages, m.streamBuf, m.width)
	b.WriteString(chatContent)

	// Permission overlay
	if m.permReq != nil {
		b.WriteString(renderPermission(m.permReq, m.width))
		b.WriteString("\n")
	}

	// Input
	if m.permReq == nil {
		b.WriteString("\n")
		b.WriteString(inputPrefixStyle.Render("> "))
		b.WriteString(m.input.View())
	}

	return b.String()
}

// Ensure unused import doesn't cause build error
var _ = json.Marshal
