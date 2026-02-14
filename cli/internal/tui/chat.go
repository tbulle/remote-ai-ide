package tui

import (
	"fmt"
	"strings"
)

type chatMessage struct {
	Role    string
	Content string
}

func renderChat(messages []chatMessage, streamBuf string, width int) string {
	var b strings.Builder

	for _, m := range messages {
		switch m.Role {
		case "user":
			b.WriteString(userStyle.Render("You") + "\n")
			b.WriteString(m.Content + "\n\n")
		case "assistant":
			b.WriteString(assistantStyle.Render("Claude") + "\n")
			b.WriteString(m.Content + "\n\n")
		case "error":
			b.WriteString(errorStyle.Render("Error: "+m.Content) + "\n\n")
		}
	}

	if streamBuf != "" {
		b.WriteString(assistantStyle.Render("Claude") + "\n")
		b.WriteString(streamStyle.Render(streamBuf))
		b.WriteString(streamStyle.Render("▊") + "\n")
	}

	return b.String()
}

func formatToolInput(raw []byte) string {
	s := string(raw)
	if len(s) > 500 {
		s = s[:500] + "..."
	}
	return s
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// Unused but reserved for glamour phase 2
var _ = fmt.Sprintf
