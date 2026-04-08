import { authFetch, getToken, setToken, clearToken, getApiBasePath } from './api';

export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export type Feature =
  | 'transcription'
  | 'summary'
  | 'mindmap'
  | 'export_pdf'
  | 'export_docx'
  | 'email'
  | 'diagram';

export interface AuthUser {
  userId: string;
  email: string;
  role: string; // 'free' | 'admin'
  plans: string[]; // ['reporter', 'specialist', 'officer']
  features: Feature[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

/** Full URL path to start Google OAuth.
 * Must use the absolute backend URL (not Vite proxy) so the oauth_state cookie
 * is set on the same origin as the callback redirect from Google. */
export function getGoogleOAuthStartUrl(): string {
  if (import.meta.env.DEV) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
    return `${apiUrl}/api/auth/google`;
  }
  return `${getApiBasePath()}/auth/google`;
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

// Dang xuat: xoa token + sensitive data, goi server (stateless, fire-and-forget)
export async function logout(): Promise<void> {
  clearToken();
  localStorage.removeItem('gemini_api_key');
  localStorage.removeItem('meeting_draft');
  localStorage.removeItem('checklist_data');
  authFetch('/auth/logout', { method: 'POST' }).catch(() => {});
}

// Lay user hien tai tu JWT (verify phia server)
// Không early-return nếu không có localStorage token vì OAuth dùng cookie
export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await authFetch('/auth/me');
    if (!res.ok) {
      clearToken(); // token het han hoac invalid
      return null;
    }
    const data = await res.json();
    if (data?.token) {
      setToken(data.token); // lưu token vào localStorage cho các request tiếp theo
    }
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

// Dang ky: server gui email xac nhan — khong luu JWT cho den khi user dang nhap sau khi verify
export async function register(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<{ ok: true; message: string }> {
  const res = await authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Đăng ký thất bại' }));
    throw new Error(err.error ?? 'Đăng ký thất bại');
  }

  const fallbackMsg = 'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.';
  let data: { ok?: boolean; message?: string; error?: string } = {};
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    if (res.status === 201 || res.status === 200) {
      return { ok: true, message: fallbackMsg };
    }
    throw new Error('Đăng ký thất bại');
  }

  if (data.ok === false) {
    throw new Error(data.error ?? data.message ?? 'Đăng ký thất bại');
  }
  const message = typeof data.message === 'string' ? data.message : fallbackMsg;
  return { ok: true, message };
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
