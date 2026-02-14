import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Sessions from './pages/Sessions';
import Chat from './pages/Chat';
import type { ServerProfile } from './types/server';

interface AuthContextType {
  servers: ServerProfile[];
  activeServer: ServerProfile | null;
  addServer: (server: ServerProfile) => void;
  removeServer: (id: string) => void;
  switchServer: (id: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  servers: [],
  activeServer: null,
  addServer: () => {},
  removeServer: () => {},
  switchServer: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const SERVER_PROFILES_KEY = 'server_profiles';
const ACTIVE_SERVER_ID_KEY = 'active_server_id';
const LEGACY_TOKEN_KEY = 'auth_token';
const DEFAULT_SERVER_NAME = 'Default Server';

function getDefaultServerUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3002`;
  }
  return `${protocol}//${hostname}`;
}

function parseServerProfiles(raw: string | null): ServerProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (server): server is ServerProfile =>
        typeof server?.id === 'string' &&
        typeof server?.name === 'string' &&
        typeof server?.url === 'string' &&
        typeof server?.token === 'string'
    );
  } catch {
    return [];
  }
}

function loadInitialAuthState() {
  let servers = parseServerProfiles(localStorage.getItem(SERVER_PROFILES_KEY));
  const storedActiveId = localStorage.getItem(ACTIVE_SERVER_ID_KEY);
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);

  if (servers.length === 0 && legacyToken) {
    const migratedServer: ServerProfile = {
      id: crypto.randomUUID(),
      name: DEFAULT_SERVER_NAME,
      url: getDefaultServerUrl(),
      token: legacyToken,
    };
    servers = [migratedServer];
    localStorage.setItem(SERVER_PROFILES_KEY, JSON.stringify(servers));
    localStorage.setItem(ACTIVE_SERVER_ID_KEY, migratedServer.id);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return { servers, activeServerId: migratedServer.id };
  }

  const activeServerId =
    storedActiveId && servers.some((server) => server.id === storedActiveId)
      ? storedActiveId
      : null;

  return { servers, activeServerId };
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(() => loadInitialAuthState());
  const [servers, setServers] = useState<ServerProfile[]>(initialState.servers);
  const [activeServerId, setActiveServerId] = useState<string | null>(
    initialState.activeServerId
  );

  useEffect(() => {
    localStorage.setItem(SERVER_PROFILES_KEY, JSON.stringify(servers));
  }, [servers]);

  useEffect(() => {
    if (activeServerId) {
      localStorage.setItem(ACTIVE_SERVER_ID_KEY, activeServerId);
    } else {
      localStorage.removeItem(ACTIVE_SERVER_ID_KEY);
    }
  }, [activeServerId]);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeServerId) || null,
    [servers, activeServerId]
  );

  const addServer = useCallback((server: ServerProfile) => {
    setServers((prev) => [...prev, server]);
  }, []);

  const removeServer = useCallback((id: string) => {
    setServers((prev) => prev.filter((server) => server.id !== id));
    setActiveServerId((prev) => (prev === id ? null : prev));
  }, []);

  const switchServer = useCallback(
    (id: string) => {
      setActiveServerId((prev) => (servers.some((server) => server.id === id) ? id : prev));
    },
    [servers]
  );

  const logout = useCallback(() => {
    setActiveServerId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ servers, activeServer, addServer, removeServer, switchServer, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { activeServer } = useAuth();
  if (!activeServer) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Sessions />
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:sessionId"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
