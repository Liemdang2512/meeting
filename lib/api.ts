const TOKEN_KEY = 'auth_token';
// Dev: Vite proxy /api -> localhost:3001 | Production: VITE_API_URL = Railway URL
const API_BASE = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      if (data.token) setToken(data.token);
      const retryHeaders = { ...headers };
      if (data.token) retryHeaders['Authorization'] = `Bearer ${data.token}`;
      return fetch(`${API_BASE}${path}`, { ...init, headers: retryHeaders, credentials: 'include' });
    }
  }

  return res;
}
