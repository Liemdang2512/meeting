---
phase: 04-replace-supabase
plan: "03"
type: execute
wave: 3
depends_on:
  - "04-01"
  - "04-02"
files_modified:
  - scripts/migrate-from-supabase.ts
autonomous: false
requirements:
  - REPLACE-SUPABASE-MIGRATION

user_setup:
  - service: supabase
    why: "Export data từ Supabase production để import vào local PostgreSQL"
    env_vars:
      - name: SUPABASE_SERVICE_ROLE_KEY
        source: "Supabase Dashboard -> Project Settings -> API -> service_role key (secret)"
      - name: SUPABASE_URL
        source: "Đã có: https://jxlextiesatnrvlxnzvd.supabase.co"

must_haves:
  truths:
    - "Script export được data từ Supabase (auth.users, profiles, user_settings, transcriptions, summaries, token_usage_logs)"
    - "Script import data vào Docker PostgreSQL (port 5433) mà không vi phạm FK constraints"
    - "Users được import với password_hash (bcrypt) để có thể login ngay"
    - "Script chạy được với: npx tsx scripts/migrate-from-supabase.ts"
    - "Sau khi migrate, user có thể login vào app local bằng credentials cũ"
  artifacts:
    - path: "scripts/migrate-from-supabase.ts"
      provides: "Migration script: Supabase REST API export -> Docker PostgreSQL import"
  key_links:
    - from: "scripts/migrate-from-supabase.ts"
      to: "Supabase REST API"
      via: "fetch với Authorization: Bearer SERVICE_ROLE_KEY"
      pattern: "fetch.*supabase.*co"
    - from: "scripts/migrate-from-supabase.ts"
      to: "Docker PostgreSQL port 5433"
      via: "postgres.js INSERT statements"
      pattern: "sql`INSERT INTO"
---

<objective>
Tạo migration script để export data từ Supabase và import vào Docker PostgreSQL local. Script handle đúng thứ tự insert (tôn trọng FK constraints), và tạo password_hash cho mỗi user để họ có thể login vào Express backend mới.

Purpose: Bảo toàn data production (transcriptions, summaries, token logs) khi chuyển sang local setup.
Output: scripts/migrate-from-supabase.ts có thể chạy một lần để hoàn tất migration.
</objective>

<execution_context>
@/Users/tanliem/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tanliem/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/tanliem/Desktop/meeting-main/.planning/phases/04-replace-supabase/04-01-SUMMARY.md
@/Users/tanliem/Desktop/meeting-main/db/schema.sql

<interfaces>
<!-- Supabase REST API để export data -->
Base URL: https://jxlextiesatnrvlxnzvd.supabase.co
Auth header: Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Content-Type: application/json

Endpoints (Supabase PostgREST):
  GET /rest/v1/auth.users?select=* (không work qua PostgREST — cần Admin API)
  GET /auth/v1/admin/users — Supabase Admin API, returns { users: User[] }
  GET /rest/v1/profiles?select=*
  GET /rest/v1/user_settings?select=*
  GET /rest/v1/transcriptions?select=*
  GET /rest/v1/summaries?select=*
  GET /rest/v1/token_usage_logs?select=*&order=created_at

Lưu ý: Supabase Admin API cho users: apikey header = service_role_key

<!-- Docker PostgreSQL (target) -->
Host: localhost, Port: 5433, DB: meeting_test
User: postgres, Password: postgres
Schema: đã có đầy đủ tables từ db/schema.sql
auth.users cần thêm column password_hash (plan 01 đã ADD COLUMN IF NOT EXISTS)

<!-- FK order cho INSERT -->
1. auth.users (no FK deps)
2. public.profiles (FK: auth.users)
3. public.user_settings (FK: auth.users)
4. public.transcriptions (FK: auth.users)
5. public.summaries (FK: public.transcriptions)
6. public.token_usage_logs (FK: auth.users)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Tạo migration script</name>
  <files>scripts/migrate-from-supabase.ts</files>
  <action>
Tạo `scripts/migrate-from-supabase.ts`. Script này:
1. Đọc SUPABASE_SERVICE_ROLE_KEY từ environment (process.env) — exit với hướng dẫn nếu thiếu
2. Export data từ Supabase qua REST/Admin API
3. Insert vào Docker PostgreSQL theo thứ tự FK
4. Generate password_hash cho mỗi user (dùng bcrypt với default password, hoặc random password in ra console)
5. Log progress rõ ràng ra console

```typescript
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://jxlextiesatnrvlxnzvd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Lỗi: SUPABASE_SERVICE_ROLE_KEY chưa được set.\n' +
    'Cách lấy: Supabase Dashboard -> Project Settings -> API -> service_role key\n' +
    'Chạy lại: SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/migrate-from-supabase.ts'
  );
  process.exit(1);
}

const sql = postgres({
  host: 'localhost',
  port: 5433,
  database: 'meeting_test',
  username: 'postgres',
  password: 'postgres',
});

// Headers cho Supabase API calls
const supabaseHeaders = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

async function fetchSupabase(path: string): Promise<any> {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { headers: supabaseHeaders });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API error ${res.status} for ${path}: ${body}`);
  }
  return res.json();
}

async function migrate() {
  console.log('=== Migration: Supabase -> Local PostgreSQL ===\n');

  // Ensure password_hash column exists (idempotent)
  await sql`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_hash text`;

  // ---- 1. Export + import auth.users ----
  console.log('1. Fetching users từ Supabase Admin API...');
  const { users } = await fetchSupabase('/auth/v1/admin/users?per_page=1000');
  console.log(`   Found ${users.length} users`);

  // Default password: "changeme123" — user sẽ phải đổi sau
  const DEFAULT_PASSWORD = 'changeme123';
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log('\n   *** QUAN TRỌNG ***');
  console.log(`   Tất cả users sẽ được đặt password tạm: "${DEFAULT_PASSWORD}"`);
  console.log('   Users cần đổi password sau khi migrate.\n');

  for (const user of users) {
    await sql`
      INSERT INTO auth.users (id, email, created_at, password_hash)
      VALUES (${user.id}::uuid, ${user.email}, ${user.created_at}::timestamptz, ${defaultHash})
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = COALESCE(auth.users.password_hash, EXCLUDED.password_hash)
    `;
    console.log(`   Imported user: ${user.email}`);
  }

  // ---- 2. Export + import profiles ----
  console.log('\n2. Fetching profiles...');
  const profiles = await fetchSupabase('/rest/v1/profiles?select=*');
  console.log(`   Found ${profiles.length} profiles`);
  for (const p of profiles) {
    await sql`
      INSERT INTO public.profiles (id, user_id, role, created_at, updated_at)
      VALUES (${p.id}::uuid, ${p.user_id}::uuid, ${p.role ?? 'user'}, ${p.created_at}::timestamptz, ${p.updated_at ?? null})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('   Profiles imported.');

  // ---- 3. Export + import user_settings ----
  console.log('\n3. Fetching user_settings...');
  const settings = await fetchSupabase('/rest/v1/user_settings?select=*');
  console.log(`   Found ${settings.length} settings`);
  for (const s of settings) {
    await sql`
      INSERT INTO public.user_settings (id, user_id, gemini_api_key, created_at, updated_at)
      VALUES (${s.id}::uuid, ${s.user_id}::uuid, ${s.gemini_api_key ?? null}, ${s.created_at}::timestamptz, ${s.updated_at}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('   User settings imported.');

  // ---- 4. Export + import transcriptions ----
  console.log('\n4. Fetching transcriptions...');
  const transcriptions = await fetchSupabase('/rest/v1/transcriptions?select=*&order=created_at');
  console.log(`   Found ${transcriptions.length} transcriptions`);
  for (const t of transcriptions) {
    await sql`
      INSERT INTO public.transcriptions (id, created_at, file_name, file_size, transcription_text, user_id)
      VALUES (${t.id}::uuid, ${t.created_at}::timestamptz, ${t.file_name}, ${t.file_size ?? null}, ${t.transcription_text}, ${t.user_id ? sql`${t.user_id}::uuid` : null})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('   Transcriptions imported.');

  // ---- 5. Export + import summaries ----
  console.log('\n5. Fetching summaries...');
  const summaries = await fetchSupabase('/rest/v1/summaries?select=*&order=created_at');
  console.log(`   Found ${summaries.length} summaries`);
  for (const s of summaries) {
    await sql`
      INSERT INTO public.summaries (id, created_at, transcription_id, summary_text, prompt_used)
      VALUES (${s.id}::uuid, ${s.created_at}::timestamptz, ${s.transcription_id ? sql`${s.transcription_id}::uuid` : null}, ${s.summary_text}, ${s.prompt_used ?? null})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('   Summaries imported.');

  // ---- 6. Export + import token_usage_logs ----
  console.log('\n6. Fetching token_usage_logs...');
  // Supabase PostgREST default limit = 1000 — nếu có nhiều hơn, cần pagination
  const logs = await fetchSupabase(
    '/rest/v1/token_usage_logs?select=*&order=created_at&limit=10000'
  );
  console.log(`   Found ${logs.length} token logs`);
  for (const l of logs) {
    await sql`
      INSERT INTO public.token_usage_logs
        (id, user_id, created_at, action_type, feature, input_tokens, output_tokens, total_tokens, model, metadata)
      VALUES (
        ${l.id}::uuid, ${l.user_id}::uuid, ${l.created_at}::timestamptz,
        ${l.action_type}, ${l.feature},
        ${l.input_tokens ?? null}, ${l.output_tokens ?? null}, ${l.total_tokens ?? null},
        ${l.model},
        ${l.metadata ? JSON.stringify(l.metadata) : null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('   Token logs imported.');

  console.log('\n=== Migration hoàn thành! ===');
  console.log(`Total: ${users.length} users, ${profiles.length} profiles, ${settings.length} settings`);
  console.log(`       ${transcriptions.length} transcriptions, ${summaries.length} summaries, ${logs.length} token logs`);
  console.log(`\nPassword tạm cho tất cả users: "${DEFAULT_PASSWORD}"`);

  await sql.end();
}

migrate().catch((err) => {
  console.error('Migration thất bại:', err.message);
  sql.end().finally(() => process.exit(1));
});
```

Lưu ý khi implement:
- `postgres.js` (đã có trong devDependencies) sử dụng tagged template literals — không dùng `sql` bên trong template literal khác trừ khi là fragment
- Với nullable UUID FKs (user_id trong transcriptions, transcription_id trong summaries), dùng conditional: nếu null thì `null`, nếu có giá trị thì cast `::uuid`
- Script dùng `ON CONFLICT (id) DO NOTHING` để idempotent — có thể chạy lại an toàn
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsc -p tsconfig.server.json --noEmit 2>&1 | grep "scripts/migrate" | head -10 || echo "No TS errors in migration script"</automated>
  </verify>
  <done>
    - scripts/migrate-from-supabase.ts tồn tại
    - Script có error check cho SUPABASE_SERVICE_ROLE_KEY
    - TypeScript không báo errors trong script
    - Chạy `npx tsx scripts/migrate-from-supabase.ts` (không có env var) báo hướng dẫn rõ ràng thay vì crash
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Migration script đã được tạo tại scripts/migrate-from-supabase.ts. Script cần SUPABASE_SERVICE_ROLE_KEY để chạy.
  </what-built>
  <how-to-verify>
    1. Lấy service_role key từ: Supabase Dashboard -> https://supabase.com/dashboard/project/jxlextiesatnrvlxnzvd -> Project Settings -> API -> "service_role" (hidden, cần click "Reveal")

    2. Đảm bảo Docker container đang chạy:
       ```
       docker ps | grep meeting_postgres_test
       # Nếu chưa chạy: docker compose -f docker-compose.test.yml up -d
       ```

    3. Chạy migration:
       ```
       SUPABASE_SERVICE_ROLE_KEY=your_key_here npx tsx scripts/migrate-from-supabase.ts
       ```

    4. Verify data đã import:
       ```
       docker exec meeting_postgres_test psql -U postgres -d meeting_test -c "SELECT COUNT(*) FROM auth.users;"
       docker exec meeting_postgres_test psql -U postgres -d meeting_test -c "SELECT email FROM auth.users;"
       ```

    5. Test login với app local (cần cả Express server và Vite dev server đang chạy):
       - Start Express: `npx tsx server/index.ts`
       - Start Vite: `npm run dev`
       - Mở http://localhost:3000
       - Login với email từ bước 4, password: `changeme123`
       - Xác nhận login thành công và app hoạt động bình thường
  </how-to-verify>
  <resume-signal>Type "approved" nếu login thành công, hoặc mô tả lỗi gặp phải</resume-signal>
</task>

</tasks>

<verification>
```bash
# Verify script syntax
npx tsx -e "import './scripts/migrate-from-supabase.ts'" 2>&1 | head -5

# Verify no service key = helpful error message
npx tsx scripts/migrate-from-supabase.ts 2>&1 | head -5

# After running migration with real key:
docker exec meeting_postgres_test psql -U postgres -d meeting_test \
  -c "SELECT table_name, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name) FROM (VALUES ('auth.users'),('profiles'),('user_settings'),('transcriptions'),('summaries'),('token_usage_logs')) AS t(table_name);"
```
</verification>

<success_criteria>
- scripts/migrate-from-supabase.ts chạy được với `npx tsx`
- Không có SUPABASE_SERVICE_ROLE_KEY -> script in hướng dẫn rõ ràng, exit 1
- Với key hợp lệ: tất cả tables được populate, log count cho từng table
- auth.users có password_hash column với bcrypt hashes
- Login vào app local với password "changeme123" thành công
- ON CONFLICT DO NOTHING cho phép chạy script lại mà không bị lỗi
</success_criteria>

<output>
Sau khi hoàn thành, tạo `/Users/tanliem/Desktop/meeting-main/.planning/phases/04-replace-supabase/04-03-SUMMARY.md`
</output>
