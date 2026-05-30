import { useEffect, useRef, useState } from 'react';

export type WsStatus = 'connecting' | 'open' | 'closed';

export interface UseWebSocketResult<T> {
  data: T | null;
  status: WsStatus;
}

export function useWebSocket<T = unknown>(url: string): UseWebSocketResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => setStatus('open');
    ws.onmessage = (e) => {
      try { setData(JSON.parse(e.data) as T); } catch { /* ignore non-JSON */ }
    };
    ws.onclose = () => setStatus('closed');
    ws.onerror = () => setStatus('closed');

    return () => { ws.close(); };
  }, [url]);

  return { data, status };
}