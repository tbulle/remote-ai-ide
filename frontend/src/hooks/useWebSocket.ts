import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type ClientMessage } from '../api/ws';

export function useWebSocket(token: string | null) {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
    const client = new WebSocketClient(wsUrl, token);
    clientRef.current = client;

    const offConnected = client.on('connected', () => setConnected(true));
    const offDisconnected = client.on('disconnected', () => setConnected(false));

    client.connect();

    return () => {
      offConnected();
      offDisconnected();
      client.disconnect();
      clientRef.current = null;
    };
  }, [token]);

  const send = useCallback((msg: ClientMessage) => {
    clientRef.current?.send(msg);
  }, []);

  return { client: clientRef.current, connected, send };
}
