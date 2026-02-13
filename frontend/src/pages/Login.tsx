import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const [token, setToken] = useState('');
  const { setToken: saveToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    saveToken(token.trim());
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1a2e]">
      <div className="bg-[#16213e] rounded-xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#e0e0e0] mb-1">Remote AI IDE</h1>
        <p className="text-sm text-gray-400 mb-6">Enter your access token</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Access token"
            autoFocus
            className="w-full bg-[#1a1a2e] text-[#e0e0e0] rounded-lg px-4 py-3 text-sm outline-none placeholder-gray-500 border border-[#0f3460] focus:border-blue-400 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full bg-[#0f3460] hover:bg-[#0f3460]/80 text-white rounded-lg py-3 text-sm font-medium min-h-[44px] disabled:opacity-40 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
