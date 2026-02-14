package cmd

import (
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/arvid/remote-ai-ide/cli/internal/client"
	"github.com/arvid/remote-ai-ide/cli/internal/config"
	"github.com/spf13/cobra"
)

var serversCmd = &cobra.Command{
	Use:   "servers",
	Short: "Manage server profiles",
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List saved servers",
	RunE: func(cmd *cobra.Command, args []string) error {
		if len(cfg.Servers) == 0 {
			fmt.Println("No servers configured. Add one with: remote-ai-ide-cli servers add")
			return nil
		}
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "NAME\tURL\tTOKEN")
		fmt.Fprintln(w, "----\t---\t-----")
		for _, s := range cfg.Servers {
			masked := maskToken(s.Token)
			fmt.Fprintf(w, "%s\t%s\t%s\n", s.Name, s.URL, masked)
		}
		w.Flush()
		return nil
	},
}

func maskToken(t string) string {
	if len(t) <= 4 {
		return strings.Repeat("*", len(t))
	}
	return t[:2] + strings.Repeat("*", len(t)-4) + t[len(t)-2:]
}

var (
	addName  string
	addURL   string
	addToken string
)

var addCmd = &cobra.Command{
	Use:   "add",
	Short: "Add a server profile",
	RunE: func(cmd *cobra.Command, args []string) error {
		if addName == "" || addURL == "" || addToken == "" {
			return fmt.Errorf("--name, --url, and --token are all required")
		}
		for _, s := range cfg.Servers {
			if s.Name == addName {
				return fmt.Errorf("server %q already exists. Remove it first or choose a different name", addName)
			}
		}
		cfg.Servers = append(cfg.Servers, config.Server{
			Name:  addName,
			URL:   strings.TrimRight(addURL, "/"),
			Token: addToken,
		})
		if err := config.Save(cfgFile, cfg); err != nil {
			return fmt.Errorf("saving config: %w", err)
		}
		fmt.Printf("Added server %q (%s)\n", addName, addURL)
		return nil
	},
}

var removeCmd = &cobra.Command{
	Use:   "remove [name]",
	Short: "Remove a server profile",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		found := false
		filtered := make([]config.Server, 0, len(cfg.Servers))
		for _, s := range cfg.Servers {
			if s.Name == name {
				found = true
				continue
			}
			filtered = append(filtered, s)
		}
		if !found {
			return fmt.Errorf("server %q not found", name)
		}
		cfg.Servers = filtered
		if err := config.Save(cfgFile, cfg); err != nil {
			return fmt.Errorf("saving config: %w", err)
		}
		fmt.Printf("Removed server %q\n", name)
		return nil
	},
}

var testCmd = &cobra.Command{
	Use:   "test [name]",
	Short: "Test server connectivity",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		servers := cfg.Servers
		if len(args) == 1 {
			s, err := cfg.FindServer(args[0])
			if err != nil {
				return err
			}
			servers = []config.Server{*s}
		}
		if len(servers) == 0 {
			fmt.Println("No servers configured.")
			return nil
		}
		for _, s := range servers {
			rest := client.NewRESTClient(s.URL, s.Token)
			health, err := rest.Health()
			if err != nil {
				fmt.Printf("  %s (%s): FAILED - %v\n", s.Name, s.URL, err)
				continue
			}
			fmt.Printf("  %s (%s): OK - %d active sessions\n", s.Name, s.URL, health.ActiveSessions)
		}
		return nil
	},
}

func init() {
	addCmd.Flags().StringVar(&addName, "name", "", "server name")
	addCmd.Flags().StringVar(&addURL, "url", "", "server URL (e.g. http://localhost:3002)")
	addCmd.Flags().StringVar(&addToken, "token", "", "auth token")

	serversCmd.AddCommand(listCmd)
	serversCmd.AddCommand(addCmd)
	serversCmd.AddCommand(removeCmd)
	serversCmd.AddCommand(testCmd)
	rootCmd.AddCommand(serversCmd)
}
