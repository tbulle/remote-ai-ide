package tui

import (
	"fmt"
	"strings"

	"github.com/arvid/remote-ai-ide/cli/internal/client"
)

func renderPermission(req *client.PermissionRequest, width int) string {
	var b strings.Builder

	title := permTitleStyle.Render("⚠ Permission Request")
	tool := permToolStyle.Render(req.ToolName)
	desc := req.Description
	if desc == "" {
		desc = fmt.Sprintf("Tool %s wants to execute", req.ToolName)
	}

	b.WriteString(title + "\n\n")
	b.WriteString("Tool: " + tool + "\n")
	b.WriteString("Description: " + desc + "\n\n")

	input := formatToolInput(req.ToolInput)
	if input != "" && input != "null" {
		b.WriteString("Input:\n" + input + "\n\n")
	}

	b.WriteString("[y] Allow  [n] Deny")

	boxWidth := width - 4
	if boxWidth < 40 {
		boxWidth = 40
	}
	if boxWidth > 80 {
		boxWidth = 80
	}

	return permBoxStyle.Width(boxWidth).Render(b.String())
}
