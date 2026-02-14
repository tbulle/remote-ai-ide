import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type ClientMessage } from '../api/ws';

function toWebSocketUrl(serverUrl: string) {
  if (serverUrl.startsWith('https://')) {
    return `wss://${serverUrl.slice('https://'.length)}`;
  }
  if (serverUrl.startsWith('http://')) {
    return `ws://${serverUrl.slice('http://'.length)}`;
  }
  if (serverUrl.startsWith('wss://') || serverUrl.startsWith('ws://')) {
    return serverUrl;
  }
  return serverUrl;
}

export function useWebSocket(token: string | null, serverUrl: string | null) {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !serverUrl) return;

    const wsUrl = toWebSocketUrl(serverUrl);
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
  }, [token, serverUrl]);

  const send = useCallback((msg: ClientMessage) => {
    clientRef.current?.send(msg);
  }, []);

  return { client: clientRef.current, connected, send };
}
