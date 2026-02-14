package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Server struct {
	Name  string `yaml:"name"`
	URL   string `yaml:"url"`
	Token string `yaml:"token"`
}

type Config struct {
	Servers []Server `yaml:"servers"`
}

func DefaultPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".remote-ai-ide.yaml"
	}
	return filepath.Join(home, ".remote-ai-ide.yaml")
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			cfg := defaultConfig()
			if writeErr := Save(path, cfg); writeErr != nil {
				return cfg, nil
			}
			fmt.Fprintf(os.Stderr, "Created default config at %s\n", path)
			return cfg, nil
		}
		return nil, fmt.Errorf("reading config: %w", err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}
	return &cfg, nil
}

func Save(path string, cfg *Config) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}

func (c *Config) FindServer(name string) (*Server, error) {
	for i := range c.Servers {
		if c.Servers[i].Name == name {
			return &c.Servers[i], nil
		}
	}
	return nil, fmt.Errorf("server %q not found in config", name)
}

func defaultConfig() *Config {
	return &Config{
		Servers: []Server{
			{Name: "local", URL: "http://localhost:3002", Token: "changeme"},
		},
	}
}
