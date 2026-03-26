import { describe, it, afterAll, expect } from 'vitest';
import { sql, closeDb } from './helpers/db';

afterAll(async () => {
  await closeDb();
});

describe('Database schema', () => {
  describe('Tables', () => {
    it('all 5 public tables exist', async () => {
      const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      const names = rows.map((r) => r.table_name as string);
      expect(names).toContain('transcriptions');
      expect(names).toContain('summaries');
      expect(names).toContain('profiles');
      expect(names).toContain('user_settings');
      expect(names).toContain('token_usage_logs');
    });

    it('auth.users table exists', async () => {
      const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'auth'
          AND table_name = 'users'
      `;
      expect(rows).toHaveLength(1);
    });

    it('token_usage_logs has all required columns', async () => {
      const rows = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_usage_logs'
        ORDER BY column_name
      `;
      const cols = rows.map((r) => r.column_name as string);
      expect(cols).toContain('id');
      expect(cols).toContain('user_id');
      expect(cols).toContain('action_type');
      expect(cols).toContain('feature');
      expect(cols).toContain('model');
      expect(cols).toContain('input_tokens');
      expect(cols).toContain('output_tokens');
      expect(cols).toContain('total_tokens');
      expect(cols).toContain('metadata');
      expect(cols).toContain('created_at');
    });
  });

  describe('Indexes', () => {
    it('token_usage_logs has 3 performance indexes', async () => {
      const rows = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'token_usage_logs'
          AND indexname LIKE 'idx_token_usage_logs_%'
        ORDER BY indexname
      `;
      const names = rows.map((r) => r.indexname as string);
      expect(names).toContain('idx_token_usage_logs_user_id');
      expect(names).toContain('idx_token_usage_logs_created_at');
      expect(names).toContain('idx_token_usage_logs_feature');
    });
  });

  describe('auth.uid() function', () => {
    it('returns NULL when no JWT context is set', async () => {
      const rows = await sql`SELECT auth.uid() AS uid`;
      // NULL is returned as null in postgres.js
      expect(rows[0].uid).toBeNull();
    });

    it('returns the correct UUID after setting JWT claims', async () => {
      const testId = '00000000-0000-0000-0000-000000000042';
      const claims = JSON.stringify({ sub: testId, role: 'authenticated' });
      // Use a transaction so set_config(is_local=true) resets after
      const tx = await sql.reserve();
      try {
        await tx`BEGIN`;
        await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
        const rows = await tx`SELECT auth.uid() AS uid`;
        expect(rows[0].uid).toBe(testId);
      } finally {
        await tx`ROLLBACK`;
        tx.release();
      }
    });
  });

  describe('is_admin() function', () => {
    it('exists in public schema', async () => {
      const rows = await sql`
        SELECT proname
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND proname = 'is_admin'
      `;
      expect(rows).toHaveLength(1);
    });
  });

  describe('Workflow groups columns', () => {
    it.todo('profiles has workflow_groups text[] column');
    it.todo('profiles has active_workflow_group text column');
  });
});
