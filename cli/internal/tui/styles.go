package tui

import "github.com/charmbracelet/lipgloss"

var (
	userStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("12")).
		Bold(true)

	assistantStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("10"))

	streamStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("250"))

	errorStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("9")).
		Bold(true)

	permBoxStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("11")).
		Padding(1, 2).
		MarginTop(1)

	permTitleStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("11")).
		Bold(true)

	permToolStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("14")).
		Bold(true)

	statusConnected = lipgloss.NewStyle().
		Foreground(lipgloss.Color("10"))

	statusDisconnected = lipgloss.NewStyle().
		Foreground(lipgloss.Color("9"))

	statusBarStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("236")).
		Foreground(lipgloss.Color("252")).
		Padding(0, 1)

	inputPrefixStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("12")).
		Bold(true)
)
