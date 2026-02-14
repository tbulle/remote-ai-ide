package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type HealthResponse struct {
	Status         string `json:"status"`
	Timestamp      string `json:"timestamp"`
	ActiveSessions int    `json:"activeSessions"`
}

type Session struct {
	ID           string `json:"id"`
	ProjectPath  string `json:"projectPath"`
	Status       string `json:"status"`
	MessageCount int    `json:"messageCount"`
	LastActivity int64  `json:"lastActivity,omitempty"`
}

type HistoryMessage struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Timestamp int64  `json:"timestamp"`
	Seq       int    `json:"seq"`
}

type SessionDetail struct {
	Session
	Messages []HistoryMessage `json:"messages"`
}

type Project struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

type RESTClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewRESTClient(baseURL, token string) *RESTClient {
	return &RESTClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *RESTClient) do(method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.http.Do(req)
}

func (c *RESTClient) Health() (*HealthResponse, error) {
	resp, err := c.do("GET", "/health", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var h HealthResponse
	if err := json.Unmarshal(body, &h); err != nil {
		// Plain text response (e.g. Traefik health intercept)
		h.Status = strings.TrimSpace(string(body))
		return &h, nil
	}
	return &h, nil
}

func (c *RESTClient) CreateSession(projectPath string) (*Session, error) {
	body := strings.NewReader(fmt.Sprintf(`{"projectPath":%q}`, projectPath))
	resp, err := c.do("POST", "/api/sessions", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 201 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("create session failed (%d): %s", resp.StatusCode, b)
	}
	var s Session
	return &s, json.NewDecoder(resp.Body).Decode(&s)
}

func (c *RESTClient) ListSessions() ([]Session, error) {
	resp, err := c.do("GET", "/api/sessions", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var sessions []Session
	return sessions, json.NewDecoder(resp.Body).Decode(&sessions)
}

func (c *RESTClient) GetSession(id string, since int) (*SessionDetail, error) {
	path := fmt.Sprintf("/api/sessions/%s", id)
	if since > 0 {
		path += fmt.Sprintf("?since=%d", since)
	}
	resp, err := c.do("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("session %s not found", id)
	}
	var sd SessionDetail
	return &sd, json.NewDecoder(resp.Body).Decode(&sd)
}

func (c *RESTClient) ListProjects() ([]Project, error) {
	resp, err := c.do("GET", "/api/projects", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var projects []Project
	return projects, json.NewDecoder(resp.Body).Decode(&projects)
}
