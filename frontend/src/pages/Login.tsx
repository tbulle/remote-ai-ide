import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import type { ServerProfile } from '../types/server';

export default function Login() {
  const { servers, activeServer, addServer, removeServer, switchServer } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const trimmedToken = token.trim();
    if (!trimmedName || !trimmedUrl || !trimmedToken) {
      setError('Please provide a name, URL, and token.');
      return;
    }
    const server: ServerProfile = {
      id: crypto.randomUUID(),
      name: trimmedName,
      url: trimmedUrl,
      token: trimmedToken,
    };
    addServer(server);
    setName('');
    setUrl('');
    setToken('');
    setError(null);
  };

  const handleConnect = (id: string) => {
    switchServer(id);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1a2e]">
      <div className="bg-[#16213e] rounded-xl p-6 w-full max-w-2xl">
        <h1 className="text-xl font-semibold text-[#e0e0e0] mb-1">Remote AI IDE</h1>
        <p className="text-sm text-gray-400 mb-6">Manage your servers</p>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#e0e0e0]">Saved Servers</h2>
              {activeServer && (
                <span className="text-xs text-gray-400">
                  Active: {activeServer.name}
                </span>
              )}
            </div>
            {servers.length === 0 ? (
              <div className="text-sm text-gray-400 bg-[#1a1a2e] rounded-lg p-4 border border-[#0f3460]">
                No servers yet. Add one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="bg-[#1a1a2e] rounded-lg p-4 border border-[#0f3460] flex flex-col gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#e0e0e0] truncate">
                        {server.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 break-all">
                        {server.url}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleConnect(server.id)}
                        disabled={activeServer?.id === server.id}
                        className="flex-1 bg-[#0f3460] hover:bg-[#0f3460]/80 text-white rounded-lg py-2 text-xs font-medium min-h-[40px] disabled:opacity-40 transition-colors"
                      >
                        {activeServer?.id === server.id ? 'Connected' : 'Connect'}
                      </button>
                      <button
                        onClick={() => removeServer(server.id)}
                        className="text-xs text-gray-400 hover:text-red-400 min-h-[40px] px-3 border border-[#0f3460] rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#0f3460]">
            <h2 className="text-sm font-semibold text-[#e0e0e0] mb-3">Add Server</h2>
            {error && (
              <div className="bg-red-900/40 text-red-300 rounded-lg p-3 mb-3 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Server name"
                className="w-full bg-[#16213e] text-[#e0e0e0] rounded-lg px-4 py-3 text-sm outline-none placeholder-gray-500 border border-[#0f3460] focus:border-blue-400 min-h-[44px]"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3002"
                className="w-full bg-[#16213e] text-[#e0e0e0] rounded-lg px-4 py-3 text-sm outline-none placeholder-gray-500 border border-[#0f3460] focus:border-blue-400 min-h-[44px]"
              />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Access token"
                className="w-full bg-[#16213e] text-[#e0e0e0] rounded-lg px-4 py-3 text-sm outline-none placeholder-gray-500 border border-[#0f3460] focus:border-blue-400 min-h-[44px]"
              />
              <button
                type="submit"
                className="w-full bg-[#0f3460] hover:bg-[#0f3460]/80 text-white rounded-lg py-3 text-sm font-medium min-h-[44px] transition-colors"
              >
                Save Server
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
