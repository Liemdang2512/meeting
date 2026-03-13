---
phase: 04-replace-supabase
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - server/index.ts
  - server/db.ts
  - server/auth.ts
  - server/routes/auth.ts
  - server/routes/users.ts
  - server/routes/transcriptions.ts
  - server/routes/summaries.ts
  - server/routes/profiles.ts
  - server/routes/tokenLogs.ts
  - tsconfig.server.json
  - package.json
autonomous: true
requirements:
  - REPLACE-SUPABASE-BACKEND

must_haves:
  truths:
    - "POST /api/auth/login trả về JWT token khi credentials hợp lệ"
    - "GET /api/auth/me trả về user info khi JWT hợp lệ"
    - "POST /api/auth/logout trả về 200 OK"
    - "GET /api/user-settings trả về gemini_api_key của user hiện tại"
    - "PUT /api/user-settings lưu gemini_api_key vào PostgreSQL"
    - "POST /api/transcriptions lưu bản ghi và trả về row đã insert"
    - "POST /api/summaries lưu tóm tắt liên kết với transcription"
    - "GET /api/profiles/role trả về role của user hiện tại"
    - "POST /api/token-logs insert log vào token_usage_logs"
    - "GET /api/token-logs (admin) trả về logs có filter theo date/feature/userId/page"
  artifacts:
    - path: "server/index.ts"
      provides: "Express app, CORS, JSON middleware, route mounting"
    - path: "server/db.ts"
      provides: "postgres.js connection pool tới Docker PostgreSQL"
    - path: "server/auth.ts"
      provides: "JWT middleware xác thực Bearer token"
    - path: "server/routes/auth.ts"
      provides: "POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me"
    - path: "server/routes/users.ts"
      provides: "GET/PUT /api/user-settings"
    - path: "server/routes/transcriptions.ts"
      provides: "POST /api/transcriptions"
    - path: "server/routes/summaries.ts"
      provides: "POST /api/summaries"
    - path: "server/routes/profiles.ts"
      provides: "GET /api/profiles/role"
    - path: "server/routes/tokenLogs.ts"
      provides: "POST /api/token-logs, GET /api/token-logs"
  key_links:
    - from: "server/routes/auth.ts"
      to: "server/db.ts"
      via: "sql query lên auth.users + public.profiles"
      pattern: "sql`SELECT.*auth\\.users`"
    - from: "server/routes/*.ts"
      to: "server/auth.ts"
      via: "requireAuth middleware"
      pattern: "router\\.use\\(requireAuth\\)"
    - from: "server/index.ts"
      to: "server/routes/*.ts"
      via: "app.use('/api/...', router)"
      pattern: "app\\.use\\('/api"
---

<objective>
Xây dựng Express backend thay thế hoàn toàn Supabase phía server. Backend này cung cấp REST API cho auth (JWT), user settings, transcriptions, summaries, profiles, và token usage logs — tất cả đều kết nối tới Docker PostgreSQL hiện có trên port 5433.

Purpose: Đây là foundation cho toàn bộ phase. Frontend (plan 02) và migration (plan 03) đều phụ thuộc vào server này hoạt động đúng.
Output: Express server chạy trên port 3001 với đầy đủ endpoints, JWT auth, và PostgreSQL connection.
</objective>

<execution_context>
@/Users/tanliem/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tanliem/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/tanliem/Desktop/meeting-main/.planning/ROADMAP.md
@/Users/tanliem/Desktop/meeting-main/types.ts
@/Users/tanliem/Desktop/meeting-main/db/schema.sql

<interfaces>
<!-- Docker PostgreSQL hiện có -->
Container: meeting_postgres_test
Port: 5433
DB: meeting_test
User: postgres
Password: postgres

<!-- Schema tables (từ db/schema.sql) -->
auth.users: id (uuid PK), email (text), created_at (timestamptz)
public.user_settings: id, user_id (FK auth.users), gemini_api_key, updated_at — UNIQUE(user_id)
public.transcriptions: id, created_at, file_name, file_size, transcription_text, user_id (FK)
public.summaries: id, created_at, transcription_id (FK), summary_text, prompt_used
public.profiles: id, user_id (FK), role (text default 'user'), created_at, updated_at
public.token_usage_logs: id, user_id (FK), created_at, action_type, feature, input_tokens,
  output_tokens, total_tokens, model, metadata (jsonb)

<!-- Types từ types.ts -->
TokenUsageFeature: 'minutes' | 'file-split' | 'token-usage-admin' | 'my-token-usage' | 'other'
TokenUsageActionType: 'minutes-generate' | 'transcribe-basic' | 'transcribe-deep' |
  'file-split-analyze' | 'admin-view' | 'my-usage-view' | 'other'
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Setup Express app, DB connection, và JWT middleware</name>
  <files>
    package.json,
    tsconfig.server.json,
    server/index.ts,
    server/db.ts,
    server/auth.ts
  </files>
  <action>
**1. Cập nhật package.json:**
- Thêm vào `dependencies`: `express`, `cors`, `bcryptjs`, `jsonwebtoken`
- Thêm vào `devDependencies`: `@types/express`, `@types/cors`, `@types/bcryptjs`, `@types/jsonwebtoken`, `tsx`, `concurrently`
- Thêm scripts:
  ```json
  "server": "tsx server/index.ts",
  "dev:all": "concurrently \"npm run dev\" \"npm run server\""
  ```
- Chạy `npm install` sau khi sửa

**2. Tạo tsconfig.server.json** (riêng cho server, không dùng tsconfig.json vì frontend dùng `"type": "module"` với Vite):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist/server",
    "rootDir": "."
  },
  "include": ["server/**/*"]
}
```
Lưu ý: `tsx` chạy TypeScript trực tiếp không cần compile — tsconfig.server.json chỉ để editor hints.

**3. Tạo server/db.ts:**
```typescript
import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  database: process.env.DB_NAME ?? 'meeting_test',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
});

export default sql;
```

**4. Tạo server/auth.ts** — JWT middleware:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.API_JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}
```

**5. Tạo server/index.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import transcriptionsRouter from './routes/transcriptions';
import summariesRouter from './routes/summaries';
import profilesRouter from './routes/profiles';
import tokenLogsRouter from './routes/tokenLogs';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/user-settings', usersRouter);
app.use('/api/transcriptions', transcriptionsRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/token-logs', tokenLogsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npm install 2>&1 | tail -5 && npx tsx -e "import sql from './server/db.ts'; sql\`SELECT 1\`.then(() => { console.log('DB OK'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); })"</automated>
  </verify>
  <done>npm install thành công, DB connection test trả về "DB OK", server/index.ts có thể start với `npx tsx server/index.ts`</done>
</task>

<task type="auto">
  <name>Task 2: Tạo tất cả route handlers</name>
  <files>
    server/routes/auth.ts,
    server/routes/users.ts,
    server/routes/transcriptions.ts,
    server/routes/summaries.ts,
    server/routes/profiles.ts,
    server/routes/tokenLogs.ts
  </files>
  <action>
**server/routes/auth.ts** — POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me:
```typescript
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db';
import { signToken, requireAuth } from '../auth';

const router = Router();

// POST /api/auth/login
// Body: { email: string, password: string }
// Lưu ý: auth.users KHÔNG lưu password — cần thêm cột password_hash vào auth.users
// HOẶC tạo bảng riêng. Quyết định: thêm password_hash vào auth.users nếu chưa có.
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  try {
    // Thêm cột password_hash nếu chưa có (idempotent)
    await sql`
      ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_hash text
    `;

    const [user] = await sql`
      SELECT id, email, password_hash FROM auth.users WHERE email = ${email}
    `;
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    // Lấy role từ profiles
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE user_id = ${user.id}
    `;
    const role = profile?.role ?? 'user';
    const token = signToken({ userId: user.id, email: user.email, role });
    return res.json({ token, user: { id: user.id, email: user.email, role } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — stateless JWT, chỉ cần client xóa token
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me — trả về user info từ JWT
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
```

**server/routes/users.ts** — GET/PUT /api/user-settings:
```typescript
import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/user-settings
router.get('/', async (req, res) => {
  try {
    const [row] = await sql`
      SELECT gemini_api_key FROM public.user_settings WHERE user_id = ${req.user!.userId}
    `;
    res.json({ gemini_api_key: row?.gemini_api_key ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user-settings
// Body: { gemini_api_key: string }
router.put('/', async (req, res) => {
  const { gemini_api_key } = req.body ?? {};
  try {
    await sql`
      INSERT INTO public.user_settings (user_id, gemini_api_key, updated_at)
      VALUES (${req.user!.userId}, ${gemini_api_key}, now())
      ON CONFLICT (user_id) DO UPDATE SET gemini_api_key = EXCLUDED.gemini_api_key, updated_at = now()
    `;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**server/routes/transcriptions.ts** — POST /api/transcriptions:
```typescript
import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/transcriptions
// Body: { file_name: string, file_size: number, transcription_text: string }
// Returns: inserted row { id, created_at, file_name, file_size, transcription_text, user_id }
router.post('/', async (req, res) => {
  const { file_name, file_size, transcription_text } = req.body ?? {};
  if (!file_name || !transcription_text) {
    return res.status(400).json({ error: 'file_name và transcription_text là bắt buộc' });
  }
  try {
    const [row] = await sql`
      INSERT INTO public.transcriptions (file_name, file_size, transcription_text, user_id)
      VALUES (${file_name}, ${file_size ?? null}, ${transcription_text}, ${req.user!.userId})
      RETURNING id, created_at, file_name, file_size, transcription_text, user_id
    `;
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
```

**server/routes/summaries.ts** — POST /api/summaries:
```typescript
import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/summaries
// Body: { transcription_id: string, summary_text: string, prompt_used?: string }
router.post('/', async (req, res) => {
  const { transcription_id, summary_text, prompt_used } = req.body ?? {};
  if (!transcription_id || !summary_text) {
    return res.status(400).json({ error: 'transcription_id và summary_text là bắt buộc' });
  }
  try {
    const [row] = await sql`
      INSERT INTO public.summaries (transcription_id, summary_text, prompt_used)
      VALUES (${transcription_id}, ${summary_text}, ${prompt_used ?? null})
      RETURNING id, created_at, transcription_id, summary_text, prompt_used
    `;
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
```

**server/routes/profiles.ts** — GET /api/profiles/role:
```typescript
import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/profiles/role
// Trả về role của user hiện tại
router.get('/role', async (req, res) => {
  try {
    const [row] = await sql`
      SELECT role FROM public.profiles WHERE user_id = ${req.user!.userId}
    `;
    res.json({ role: row?.role ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**server/routes/tokenLogs.ts** — POST /api/token-logs (mọi user), GET /api/token-logs (admin only):
```typescript
import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/token-logs
// Body: { feature, action_type, model, input_tokens?, output_tokens?, total_tokens?, metadata? }
router.post('/', async (req, res) => {
  const { feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata } =
    req.body ?? {};
  if (!feature || !action_type || !model) {
    return res.status(400).json({ error: 'feature, action_type, model là bắt buộc' });
  }
  try {
    await sql`
      INSERT INTO public.token_usage_logs
        (user_id, feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata)
      VALUES (
        ${req.user!.userId}, ${feature}, ${action_type}, ${model},
        ${input_tokens ?? null}, ${output_tokens ?? null}, ${total_tokens ?? null},
        ${metadata ? JSON.stringify(metadata) : null}
      )
    `;
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/token-logs?from=ISO&to=ISO&feature=?&userId=?&page=1&pageSize=20
// Admin only — kiểm tra role từ JWT
router.get('/', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có thể xem tất cả token logs' });
  }
  const { from, to, feature, userId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  if (!from || !to) {
    return res.status(400).json({ error: 'from và to (ISO date) là bắt buộc' });
  }
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    // Build dynamic WHERE clauses với postgres.js tagged template
    const featureFilter = feature && feature !== 'all' ? sql`AND feature = ${feature}` : sql``;
    const userFilter = userId ? sql`AND user_id = ${userId}::uuid` : sql``;

    const rows = await sql`
      SELECT * FROM public.token_usage_logs
      WHERE created_at >= ${from}::timestamptz
        AND created_at <= ${to}::timestamptz
        ${featureFilter}
        ${userFilter}
      ORDER BY created_at DESC
      LIMIT ${pageSizeNum} OFFSET ${offset}
    `;
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
```
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsx server/index.ts &amp; SERVER_PID=$! && sleep 2 && curl -s http://localhost:3001/api/health | grep -q '"ok":true' &amp;&amp; echo "Server OK" && kill $SERVER_PID</automated>
  </verify>
  <done>
    - Server start thành công, /api/health trả về {"ok":true}
    - POST /api/auth/login với credentials sai trả về 401
    - GET /api/auth/me không có token trả về 401
    - Tất cả route files tồn tại và không có TypeScript errors khi chạy với tsx
  </done>
</task>

</tasks>

<verification>
```bash
# 1. Start server
cd /Users/tanliem/Desktop/meeting-main
npx tsx server/index.ts &

# 2. Health check
curl http://localhost:3001/api/health

# 3. Login với user không tồn tại (expect 401)
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notexist@test.com","password":"wrong"}' | grep -q "không đúng" && echo "401 OK"

# 4. Protected route không có token (expect 401)
curl -s http://localhost:3001/api/user-settings | grep -q "Unauthorized" && echo "Auth guard OK"

# 5. TypeScript check (optional)
npx tsc -p tsconfig.server.json --noEmit 2>&1 | head -20
```
</verification>

<success_criteria>
- Express server khởi động trên port 3001 không có lỗi
- /api/health trả về {"ok":true}
- Tất cả 9 endpoints tồn tại và respond đúng HTTP status
- Auth middleware chặn requests không có token (401)
- Token signing/verification hoạt động với JWT_SECRET từ env
- DB connection tới Docker PostgreSQL port 5433 thành công
</success_criteria>

<output>
Sau khi hoàn thành, tạo `/Users/tanliem/Desktop/meeting-main/.planning/phases/04-replace-supabase/04-01-SUMMARY.md`
</output>
