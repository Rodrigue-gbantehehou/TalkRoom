const VITE_API = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
const VITE_WS = (import.meta as any)?.env?.VITE_WS_URL as string | undefined;

// Use same-origin by default in browser: API_URL = '' so fetch(`${API_URL}/api/...`) -> '/api/...'
export const API_URL = VITE_API ?? (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:3000');

// Derive WS from current location by default (wss for https, ws for http)
export const WS_URL = VITE_WS ?? (typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : 'ws://127.0.0.1:3000');
