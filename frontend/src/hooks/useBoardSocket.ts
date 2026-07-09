import { useEffect, useRef, useCallback } from "react";
import type { BoardEvent } from "../types";
import { getAccessToken } from "../lib/supabase";

const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

export function useBoardSocket(boardId: string | undefined, onEvent: (event: BoardEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!boardId) return () => undefined;

    let ws: WebSocket | null = null;
    let retries = 0;
    let closed = false;

    const open = async () => {
      const token = await getAccessToken();
      if (!token) return;

      ws = new WebSocket(`${WS_BASE}/ws/boards/${boardId}?token=${token}`);
      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as BoardEvent;
          if (event.type !== "pong") onEventRef.current(event);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closed) {
          retries += 1;
          setTimeout(open, Math.min(1000 * retries, 10000));
        }
      };
    };

    void open();
    const ping = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send("ping"), 30000);

    return () => {
      closed = true;
      clearInterval(ping);
      ws?.close();
    };
  }, [boardId]);

  useEffect(() => {
    return connect();
  }, [connect]);
}
