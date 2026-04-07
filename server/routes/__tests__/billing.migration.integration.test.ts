import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sql from '../../db';
import { isLegacyAccessAllowed } from '../../billing/legacyAccessPolicy';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000211';
const TEST_EMAIL = 'billing-migration-integration@example.com';

async function setupTestUser() {
  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${TEST_USER_ID}, ${TEST_EMAIL}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
}

async function cleanupTestData() {
  await sql`DELETE FROM public.legacy_migration_assignments WHERE user_id = ${TEST_USER_ID}`;
  await sql`DELETE FROM public.legacy_migration_batches WHERE code LIKE 'TEST_BATCH_%'`;
  await sql`DELETE FROM auth.users WHERE id = ${TEST_USER_ID}`;
}

describe('Billing migration policy integration (D-08/D-09)', () => {
  beforeEach(async () => {
    await setupTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('allows legacy paid access inside the user-specific grace window', async () => {
    await sql`
      INSERT INTO public.legacy_migration_batches (code, description, created_by)
      VALUES ('TEST_BATCH_ACTIVE', 'integration batch', 'system')
    `;

    await sql`
      INSERT INTO public.legacy_migration_assignments (
        user_id,
        batch_code,
        legacy_access_until,
        assigned_by
      ) VALUES (
        ${TEST_USER_ID},
        'TEST_BATCH_ACTIVE',
        NOW() + INTERVAL '30 minutes',
        'system'
      )
    `;

    const [assignment] = await sql`
      SELECT legacy_access_until
      FROM public.legacy_migration_assignments
      WHERE user_id = ${TEST_USER_ID}
      ORDER BY assigned_at DESC
      LIMIT 1
    `;

    expect(isLegacyAccessAllowed(assignment?.legacy_access_until, new Date())).toBe(true);
  });

  it('denies legacy paid access after the assigned sunset timestamp', async () => {
    await sql`
      INSERT INTO public.legacy_migration_batches (code, description, created_by)
      VALUES ('TEST_BATCH_EXPIRED', 'integration batch', 'system')
    `;

    await sql`
      INSERT INTO public.legacy_migration_assignments (
        user_id,
        batch_code,
        legacy_access_until,
        assigned_by
      ) VALUES (
        ${TEST_USER_ID},
        'TEST_BATCH_EXPIRED',
        NOW() - INTERVAL '1 minute',
        'system'
      )
    `;

    const [assignment] = await sql`
      SELECT legacy_access_until
      FROM public.legacy_migration_assignments
      WHERE user_id = ${TEST_USER_ID}
      ORDER BY assigned_at DESC
      LIMIT 1
    `;

    expect(isLegacyAccessAllowed(assignment?.legacy_access_until, new Date())).toBe(false);
  });
});
