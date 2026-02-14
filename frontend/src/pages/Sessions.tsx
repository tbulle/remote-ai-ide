import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { apiCall } from '../api/rest';

interface Session {
  id: string;
  projectPath: string;
  status: string;
  messageCount: number;
  lastActivity: string;
}

export default function Sessions() {
  const { activeServer, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const token = activeServer?.token ?? null;
  const serverUrl = activeServer?.url ?? null;

  const fetchSessions = useCallback(async () => {
    if (!token || !serverUrl) return;
    try {
      const data = await apiCall<Session[]>('/api/sessions', token, undefined, serverUrl);
      setSessions(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [token, serverUrl]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (sessionId: string) => {
    if (!token || !serverUrl) return;
    try {
      await apiCall(`/api/sessions/${sessionId}`, token, { method: 'DELETE' }, serverUrl);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete session');
    }
  };

  const handleCreateSession = async () => {
    if (!token || !serverUrl || creatingSession) return;
    setCreatingSession(true);
    setError(null);
    try {
      const session = await apiCall<{ id: string }>(
        '/api/sessions',
        token,
        { method: 'POST' },
        serverUrl
      );
      navigate(`/chat/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };

  const projectName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#e0e0e0]">Sessions</h1>
            <div className="text-xs text-gray-500 mt-1">
              {activeServer?.name ?? 'No server selected'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Switch Server
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 text-red-300 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateSession}
          disabled={!token || !serverUrl || creatingSession}
          className="w-full bg-[#0f3460] hover:bg-[#0f3460]/80 disabled:bg-[#0f3460]/50 disabled:cursor-not-allowed text-white rounded-lg py-3 mb-4 text-sm font-medium min-h-[44px] transition-colors"
        >
          New Session
        </button>

        {loading ? (
          <div className="text-gray-400 text-center py-8">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No active sessions. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-[#16213e] rounded-lg p-3 flex items-center gap-3"
              >
                <button
                  onClick={() => navigate(`/chat/${session.id}`)}
                  className="flex-1 text-left min-h-[44px]"
                >
                  <div className="text-sm font-medium text-[#e0e0e0]">
                    {projectName(session.projectPath)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span className={
                      session.status === 'ready'
                        ? 'text-green-400'
                        : session.status === 'busy'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }>
                      {session.status}
                    </span>
                    <span>{session.messageCount} msgs</span>
                    <span>{formatTime(session.lastActivity)}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(session.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Delete session"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
