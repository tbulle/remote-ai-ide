package cmd

import (
	"fmt"
	"os"

	"github.com/arvid/remote-ai-ide/cli/internal/client"
	"github.com/arvid/remote-ai-ide/cli/internal/tui"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"
)

var projectPath string

var connectCmd = &cobra.Command{
	Use:   "connect",
	Short: "Connect to a Remote AI IDE server",
	RunE: func(cmd *cobra.Command, args []string) error {
		srv, err := cfg.FindServer(serverName)
		if err != nil {
			return err
		}

		rest := client.NewRESTClient(srv.URL, srv.Token)

		// Health check
		fmt.Fprintf(os.Stderr, "Connecting to %s (%s)...\n", srv.Name, srv.URL)
		health, err := rest.Health()
		if err != nil {
			return fmt.Errorf("server unreachable: %w", err)
		}
		fmt.Fprintf(os.Stderr, "Server OK: %s, %d active sessions\n", health.Status, health.ActiveSessions)

		// Resolve project path
		project := projectPath
		if project == "" {
			cwd, err := os.Getwd()
			if err != nil {
				return err
			}
			project = cwd
		}

		// Create session
		fmt.Fprintf(os.Stderr, "Creating session for %s...\n", project)
		session, err := rest.CreateSession(project)
		if err != nil {
			return fmt.Errorf("create session: %w", err)
		}
		fmt.Fprintf(os.Stderr, "Session: %s\n", session.ID)

		// Connect WebSocket
		ws, err := client.NewWSClient(srv.URL, srv.Token)
		if err != nil {
			return fmt.Errorf("websocket: %w", err)
		}
		defer ws.Close()

		// Launch TUI
		model := tui.NewModel(ws, session.ID, srv.Name)
		p := tea.NewProgram(model, tea.WithAltScreen())
		if _, err := p.Run(); err != nil {
			return err
		}
		return nil
	},
}

func init() {
	connectCmd.Flags().StringVar(&projectPath, "project", "", "project path (defaults to cwd)")
	rootCmd.AddCommand(connectCmd)
}
