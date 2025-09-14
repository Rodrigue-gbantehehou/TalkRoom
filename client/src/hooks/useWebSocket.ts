import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config';

interface UseWebSocketProps {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({ onMessage, onOpen, onClose, onError }: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const isConnecting = useRef(false);

  const connect = useCallback((token?: string) => {
    if (ws.current?.readyState === WebSocket.OPEN || isConnecting.current) {
      return;
    }

    isConnecting.current = true;
    const wsUrl = token ? `${WS_URL}/?token=${token}` : `${WS_URL}/ws`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        reconnectAttempts.current = 0;
        isConnecting.current = false;
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        isConnecting.current = false;
        onClose?.();
        
        // Only auto-reconnect if it wasn't a clean close and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      isConnecting.current = false;
      onError?.(error as Event);
    }
  }, [onMessage, onOpen, onClose, onError]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
}
