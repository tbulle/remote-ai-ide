package tui

import "fmt"

func renderStatusBar(connected bool, sessionStatus string, serverName string, width int) string {
	var connDot string
	if connected {
		connDot = statusConnected.Render("● Connected")
	} else {
		connDot = statusDisconnected.Render("● Disconnected")
	}

	center := fmt.Sprintf("Session: %s", sessionStatus)
	right := serverName

	// Pad to fill width
	usedLen := len("● Connected") + len(center) + len(right) + 4
	gap := width - usedLen
	if gap < 2 {
		gap = 2
	}
	leftPad := gap / 2
	rightPad := gap - leftPad

	bar := fmt.Sprintf("%s%*s%s%*s%s", connDot, leftPad, "", center, rightPad, "", right)
	return statusBarStyle.Width(width).Render(bar)
}
