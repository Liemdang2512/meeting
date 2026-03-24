import { authFetch, getToken, setToken, clearToken } from './api';

export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

// Dang nhap: lay JWT, luu vao localStorage
export async function login(email: string, password: string): Promise<void> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Dang nhap that bai' }));
    throw new Error(err.error ?? 'Dang nhap that bai');
  }
  const data = await res.json();
  setToken(data.token);
}

// Dang xuat: xoa token local, goi server (stateless, fire-and-forget)
export async function logout(): Promise<void> {
  clearToken();
  authFetch('/auth/logout', { method: 'POST' }).catch(() => {}); // ignore errors
}

// Lay user hien tai tu JWT (verify phia server)
export async function getMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await authFetch('/auth/me');
    if (!res.ok) {
      clearToken(); // token het han hoac invalid
      return null;
    }
    const data = await res.json();
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

// Load API key tu server
export async function loadApiKeyFromAccount(_userId: string): Promise<string | null> {
  try {
    const res = await authFetch('/user-settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data.gemini_api_key ?? null;
  } catch {
    return null;
  }
}

// Dang ky tai khoan moi: lay JWT, luu vao localStorage
export async function register(email: string, password: string, confirmPassword: string, workflowGroups: WorkflowGroup[]): Promise<void> {
  const res = await authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword, workflowGroups }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Đăng ký thất bại' }));
    throw new Error(err.error ?? 'Đăng ký thất bại');
  }
  const data = await res.json();
  setToken(data.token);
}

// Save API key len server
export async function saveApiKeyToAccount(_userId: string, apiKey: string): Promise<boolean> {
  try {
    const res = await authFetch('/user-settings', {
      method: 'PUT',
      body: JSON.stringify({ gemini_api_key: apiKey }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
