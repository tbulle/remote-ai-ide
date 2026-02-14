package tui

import "strings"

type slashCmd int

const (
	cmdNone slashCmd = iota
	cmdQuit
	cmdReset
	cmdHelp
)

func parseSlashCommand(input string) slashCmd {
	input = strings.TrimSpace(input)
	switch {
	case input == "/quit" || input == "/exit":
		return cmdQuit
	case input == "/reset":
		return cmdReset
	case input == "/help":
		return cmdHelp
	default:
		return cmdNone
	}
}

func helpText() string {
	return `Available commands:
  /help   - Show this help
  /reset  - Reset the current session
  /quit   - Exit the application

Shortcuts:
  Ctrl+C  - Interrupt current operation
  Ctrl+D  - Quit`
}
