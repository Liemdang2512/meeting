---
phase: 04-replace-supabase
plan: "02"
type: execute
wave: 2
depends_on:
  - "04-01"
files_modified:
  - lib/api.ts
  - lib/auth.ts
  - lib/supabase.ts
  - App.tsx
  - components/LoginPage.tsx
  - services/tokenUsageService.ts
  - features/token-usage-admin/hooks/useTokenUsageLogs.ts
  - vite.config.ts
  - package.json
autonomous: true
requirements:
  - REPLACE-SUPABASE-FRONTEND

must_haves:
  truths:
    - "User có thể đăng nhập bằng email/password, JWT được lưu vào localStorage"
    - "Sau khi refresh trang, session được khôi phục từ localStorage (không cần login lại)"
    - "Đăng xuất xóa JWT khỏi localStorage và trả về trang login"
    - "Gemini API key load/save hoạt động qua /api/user-settings"
    - "Transcription và summary insert hoạt động qua /api/transcriptions và /api/summaries"
    - "Token logs được ghi qua /api/token-logs"
    - "Admin có thể xem token logs qua /api/token-logs với GET"
    - "npm run dev chạy Vite proxy /api requests đến localhost:3001"
  artifacts:
    - path: "lib/api.ts"
      provides: "fetch wrapper với auth header, getToken/setToken/clearToken helpers"
      exports: ["authFetch", "getToken", "setToken", "clearToken"]
    - path: "lib/auth.ts"
      provides: "login(), logout(), getMe(), AuthState type"
      exports: ["login", "logout", "getMe", "AuthState", "AuthUser"]
    - path: "lib/supabase.ts"
      provides: "Re-exports từ lib/auth.ts để tránh break imports hiện có"
    - path: "vite.config.ts"
      provides: "server.proxy /api -> http://localhost:3001"
  key_links:
    - from: "components/LoginPage.tsx"
      to: "lib/auth.ts"
      via: "import login from lib/auth"
      pattern: "import.*login.*from.*lib/auth"
    - from: "App.tsx"
      to: "lib/auth.ts"
      via: "getMe() thay thế onAuthStateChange"
      pattern: "getMe\\(\\)"
    - from: "services/tokenUsageService.ts"
      to: "lib/api.ts"
      via: "authFetch POST /api/token-logs"
      pattern: "authFetch.*token-logs"
    - from: "features/token-usage-admin/hooks/useTokenUsageLogs.ts"
      to: "lib/api.ts"
      via: "authFetch GET /api/token-logs"
      pattern: "authFetch.*token-logs"
---

<objective>
Thay thế toàn bộ Supabase client calls trong frontend bằng fetch calls tới Express backend. Tạo lib/api.ts (fetch wrapper) và lib/auth.ts (auth functions), sau đó cập nhật App.tsx, LoginPage, tokenUsageService, và useTokenUsageLogs. Supabase package vẫn còn trong node_modules nhưng không còn được import nữa.

Purpose: Sau plan này, app hoàn toàn chạy được với Express + PostgreSQL local, không cần bất kỳ Supabase service nào.
Output: Frontend SPA hoạt động với JWT auth, proxy /api tới Express backend.
</objective>

<execution_context>
@/Users/tanliem/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tanliem/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/tanliem/Desktop/meeting-main/.planning/phases/04-replace-supabase/04-01-SUMMARY.md
@/Users/tanliem/Desktop/meeting-main/types.ts
@/Users/tanliem/Desktop/meeting-main/lib/supabase.ts
@/Users/tanliem/Desktop/meeting-main/App.tsx
@/Users/tanliem/Desktop/meeting-main/components/LoginPage.tsx
@/Users/tanliem/Desktop/meeting-main/services/tokenUsageService.ts
@/Users/tanliem/Desktop/meeting-main/features/token-usage-admin/hooks/useTokenUsageLogs.ts
@/Users/tanliem/Desktop/meeting-main/vite.config.ts

<interfaces>
<!-- Contracts từ Express backend (plan 01) -->

POST /api/auth/login
  Body: { email: string, password: string }
  Response 200: { token: string, user: { id: string, email: string, role: string } }
  Response 401: { error: string }

POST /api/auth/logout
  Response 200: { ok: true }

GET /api/auth/me (Bearer token required)
  Response 200: { user: { userId: string, email: string, role: string } }
  Response 401: { error: 'Unauthorized' }

GET /api/user-settings (Bearer token required)
  Response 200: { gemini_api_key: string | null }

PUT /api/user-settings (Bearer token required)
  Body: { gemini_api_key: string }
  Response 200: { ok: true }

POST /api/transcriptions (Bearer token required)
  Body: { file_name: string, file_size: number, transcription_text: string }
  Response 201: { id, created_at, file_name, file_size, transcription_text, user_id }

POST /api/summaries (Bearer token required)
  Body: { transcription_id: string, summary_text: string, prompt_used?: string }
  Response 201: { id, created_at, transcription_id, summary_text, prompt_used }

GET /api/profiles/role (Bearer token required)
  Response 200: { role: string | null }

POST /api/token-logs (Bearer token required)
  Body: { feature, action_type, model, input_tokens?, output_tokens?, total_tokens?, metadata? }
  Response 201: { ok: true }

GET /api/token-logs?from=ISO&to=ISO&feature=?&userId=?&page=1&pageSize=20 (admin only)
  Response 200: TokenUsageLog[] (snake_case từ DB)

<!-- AuthUser type từ server/auth.ts -->
interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

<!-- TokenUsageLog type từ types.ts -->
interface TokenUsageLog {
  id: string;
  userId: string;
  createdAt: string;
  feature: TokenUsageFeature;
  actionType: TokenUsageActionType;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  model: string;
  metadata: TokenUsageMetadata | null;
}
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Tạo lib/api.ts và lib/auth.ts, cập nhật lib/supabase.ts</name>
  <files>
    lib/api.ts,
    lib/auth.ts,
    lib/supabase.ts
  </files>
  <action>
**1. Tạo lib/api.ts** — fetch wrapper với JWT support:
```typescript
const TOKEN_KEY = 'auth_token';
const API_BASE = '/api'; // Vite proxy /api -> localhost:3001

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
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
```

**2. Tạo lib/auth.ts** — thay thế toàn bộ logic từ lib/supabase.ts:
```typescript
import { authFetch, getToken, setToken, clearToken } from './api';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

// Đăng nhập: lấy JWT, lưu vào localStorage
export async function login(email: string, password: string): Promise<void> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Đăng nhập thất bại' }));
    throw new Error(err.error ?? 'Đăng nhập thất bại');
  }
  const data = await res.json();
  setToken(data.token);
}

// Đăng xuất: xóa token local, gọi server (stateless, fire-and-forget)
export async function logout(): Promise<void> {
  clearToken();
  authFetch('/auth/logout', { method: 'POST' }).catch(() => {}); // ignore errors
}

// Lấy user hiện tại từ JWT (verify phía server)
export async function getMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await authFetch('/auth/me');
    if (!res.ok) {
      clearToken(); // token hết hạn hoặc invalid
      return null;
    }
    const data = await res.json();
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

// Load API key từ server
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

// Save API key lên server
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
```

**3. Cập nhật lib/supabase.ts** — Re-export để tránh phải sửa tất cả các import hiện có ngay lập tức. Xóa toàn bộ nội dung cũ, thay bằng:
```typescript
// DEPRECATED: File này chuyển sang Express + JWT. Giữ lại để backward compat.
// Tất cả imports từ lib/supabase sẽ hoạt động nhờ re-export này.
export { login as signInWithEmail, logout as signOut, loadApiKeyFromAccount, saveApiKeyToAccount } from './auth';
export type { AuthState } from './auth';

// Các exports cũ không còn dùng — trả về no-op
export const supabase = null;
export const isSupabaseConfigured = () => false;
export const getInitialAuthState = async () => ({ session: null, user: null });
```
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "lib/api|lib/auth|lib/supabase" | head -20 || echo "No errors in lib files"</automated>
  </verify>
  <done>
    - lib/api.ts, lib/auth.ts tồn tại với exports đúng
    - lib/supabase.ts re-exports không gây TypeScript errors
    - getToken/setToken/clearToken sử dụng localStorage key 'auth_token'
  </done>
</task>

<task type="auto">
  <name>Task 2: Cập nhật App.tsx, LoginPage, tokenUsageService, useTokenUsageLogs, và vite.config.ts</name>
  <files>
    App.tsx,
    components/LoginPage.tsx,
    services/tokenUsageService.ts,
    features/token-usage-admin/hooks/useTokenUsageLogs.ts,
    vite.config.ts
  </files>
  <action>
**1. Cập nhật components/LoginPage.tsx:**
Thay import từ `lib/supabase` sang `lib/auth`:
```typescript
// BEFORE:
import { signInWithEmail } from '../lib/supabase';
// AFTER:
import { login } from '../lib/auth';
```
Thay `signInWithEmail(email.trim(), password)` thành `login(email.trim(), password)`.
Thay text "Tài khoản được tạo bởi admin trong Supabase Dashboard." thành "Tài khoản được tạo bởi admin."

**2. Cập nhật App.tsx:**

Tìm và thay imports Supabase:
```typescript
// REMOVE:
import { supabase, isSupabaseConfigured, getInitialAuthState, signOut, loadApiKeyFromAccount, saveApiKeyToAccount, type AuthState } from './lib/supabase';

// ADD:
import { getMe, logout as signOut, loadApiKeyFromAccount, saveApiKeyToAccount } from './lib/auth';
import type { AuthUser } from './lib/auth';
```

Thay AuthState usage:
- Thay `AuthState` type bằng `{ user: AuthUser | null }` hoặc đơn giản dùng `AuthUser | null` cho state
- Thay `authState.user?.id` thành `user?.userId` (AuthUser dùng `userId` không phải `id`)

Thay `getInitialAuthState()`:
```typescript
// BEFORE:
const authState = await getInitialAuthState();
// AFTER:
const user = await getMe();
```

Thay `supabase.auth.onAuthStateChange()`:
- Xóa toàn bộ `supabase.auth.onAuthStateChange` listener
- Thêm polling đơn giản HOẶC không dùng realtime (session check khi mount là đủ)
- Pattern: `useEffect(() => { getMe().then(setUser); }, [])`

Tìm `supabase.from('transcriptions').insert(...)`:
```typescript
// REPLACE với:
const res = await authFetch('/transcriptions', {
  method: 'POST',
  body: JSON.stringify({ file_name, file_size, transcription_text }),
});
const row = await res.json();
```

Tìm `supabase.from('summaries').insert(...)`:
```typescript
// REPLACE với:
await authFetch('/summaries', {
  method: 'POST',
  body: JSON.stringify({ transcription_id, summary_text, prompt_used }),
});
```

Tìm `supabase.from('profiles').select('role').eq('user_id',id).maybeSingle()` (admin check):
```typescript
// REPLACE với:
const res = await authFetch('/profiles/role');
const { role } = await res.json();
const isAdmin = role === 'admin';
```
Nếu role đã có trong AuthUser từ getMe(), dùng luôn `user?.role === 'admin'` — không cần fetch thêm.

Thêm import authFetch:
```typescript
import { authFetch } from './lib/api';
```

**3. Cập nhật services/tokenUsageService.ts:**
Xóa Supabase imports, thay bằng authFetch:
```typescript
// REMOVE:
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ADD:
import { authFetch } from '../lib/api';
import { getToken } from '../lib/api';
```

Thay `logTokenUsage` function body:
```typescript
export const logTokenUsage = async (params: LogTokenUsageParams): Promise<void> => {
  if (!getToken()) return; // không log nếu chưa đăng nhập

  const payload = {
    user_id: params.userId,       // server sẽ ignore, dùng userId từ JWT
    feature: params.feature,
    action_type: params.actionType,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.totalTokens,
    metadata: params.metadata ?? null,
  };

  try {
    const res = await authFetch('/token-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('Failed to log token usage', await res.text());
    }
  } catch (error) {
    console.warn('Unexpected error while logging token usage', error);
  }
};
```

**4. Cập nhật features/token-usage-admin/hooks/useTokenUsageLogs.ts:**
Xóa Supabase imports, thay bằng authFetch:
```typescript
// REMOVE:
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

// ADD:
import { authFetch, getToken } from '../../../lib/api';
```

Thay `fetchLogs` function:
```typescript
const fetchLogs = useCallback(async () => {
  if (!getToken()) {
    setLogs([]);
    return;
  }
  setIsLoading(true);
  setError(null);
  try {
    const fromIso = options.fromDate.toISOString();
    const toIso = options.toDate.toISOString();
    const params = new URLSearchParams({
      from: fromIso,
      to: toIso,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (options.feature && options.feature !== 'all') {
      params.set('feature', options.feature);
    }
    if (options.userId) {
      params.set('userId', options.userId);
    }
    const res = await authFetch(`/token-logs?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Lỗi không xác định' }));
      setError(err.error ?? 'Không thể tải log token usage.');
      setLogs([]);
      return;
    }
    const data: any[] = await res.json();
    const mappedLogs: TokenUsageLog[] = data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      feature: row.feature,
      actionType: row.action_type,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      model: row.model,
      metadata: (row.metadata ?? null) as TokenUsageMetadata | null,
    }));
    setLogs(mappedLogs);
  } catch (err: any) {
    setError(err.message ?? 'Không thể tải log token usage.');
    setLogs([]);
  } finally {
    setIsLoading(false);
  }
}, [options.fromDate, options.toDate, options.feature, options.userId, page, pageSize]);
```

**5. Cập nhật vite.config.ts:**
Thêm `server.proxy` vào config object (bên trong `server: { ... }`):
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
},
```
Xóa chunk `vendor-supabase` từ `manualChunks` vì không còn dùng Supabase.
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "node_modules" | head -30</automated>
  </verify>
  <done>
    - `npx tsc --noEmit --skipLibCheck` không có errors trong project files (chỉ có thể có warnings trong node_modules)
    - Không còn import nào từ `@supabase/supabase-js` trong App.tsx, LoginPage.tsx, tokenUsageService.ts, useTokenUsageLogs.ts
    - vite.config.ts có proxy /api -> localhost:3001
    - `npm run dev` start thành công (Vite không báo lỗi)
  </done>
</task>

</tasks>

<verification>
```bash
cd /Users/tanliem/Desktop/meeting-main

# 1. TypeScript check
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules | head -20

# 2. Không còn Supabase imports trong các file đã update
grep -rn "from '@supabase/supabase-js'" App.tsx components/LoginPage.tsx services/tokenUsageService.ts features/token-usage-admin/hooks/useTokenUsageLogs.ts

# 3. Vite config có proxy
grep -A3 "proxy" vite.config.ts

# 4. Start dev server (cần Express đang chạy ở port 3001)
npm run dev -- --host 0.0.0.0 2>&1 | head -10
```
</verification>

<success_criteria>
- lib/api.ts export đúng: authFetch, getToken, setToken, clearToken
- lib/auth.ts export đúng: login, logout, getMe, loadApiKeyFromAccount, saveApiKeyToAccount
- lib/supabase.ts re-exports hoạt động (không break imports hiện có)
- App.tsx không còn dùng supabase.auth.onAuthStateChange — dùng getMe() trong useEffect
- Tất cả 5 files đã cập nhật không còn import trực tiếp từ @supabase/supabase-js
- Vite proxy /api -> http://localhost:3001 được cấu hình
- TypeScript compile không có errors trong project source files
</success_criteria>

<output>
Sau khi hoàn thành, tạo `/Users/tanliem/Desktop/meeting-main/.planning/phases/04-replace-supabase/04-02-SUMMARY.md`
</output>
