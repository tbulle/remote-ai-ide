package cmd

import (
	"fmt"
	"os"

	"github.com/arvid/remote-ai-ide/cli/internal/config"
	"github.com/spf13/cobra"
)

var (
	cfgFile    string
	serverName string
	cfg        *config.Config
)

var rootCmd = &cobra.Command{
	Use:   "remote-ai-ide-cli",
	Short: "Terminal client for Remote AI IDE",
	Long:  "Connect to Remote AI IDE servers and interact with Claude from your terminal.",
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		var err error
		cfg, err = config.Load(cfgFile)
		if err != nil {
			return fmt.Errorf("config: %w", err)
		}
		return nil
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", config.DefaultPath(), "config file path")
	rootCmd.PersistentFlags().StringVar(&serverName, "server", "local", "server name from config")
}
