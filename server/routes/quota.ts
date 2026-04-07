import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { LEGACY_OVERDRAFT_FLOOR_CREDITS } from '../billing/legacyAccessPolicy';

const router = Router();

export function buildWalletQuotaPayload(input: {
  role?: string;
  balanceCredits?: number | null;
  legacyAccessUntil?: Date | string | null;
}) {
  return {
    role: input.role ?? 'free',
    billingModel: 'wallet' as const,
    balance: Number(input.balanceCredits ?? 0),
    overdraftLimit: LEGACY_OVERDRAFT_FLOOR_CREDITS,
    legacyAccessUntil: input.legacyAccessUntil ?? null,
  };
}

export function isSchemaFallbackError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === '42P01' || code === '42703';
}

export async function loadWalletSnapshot(
  loaders: {
    loadWallet: () => Promise<{ balance_credits?: number | null } | null | undefined>;
    loadLegacyAssignment: () => Promise<{ legacy_access_until?: Date | string | null } | null | undefined>;
  },
): Promise<{ balanceCredits: number; legacyAccessUntil: Date | string | null }> {
  let balanceCredits = 0;
  let legacyAccessUntil: Date | string | null = null;

  try {
    const wallet = await loaders.loadWallet();
    balanceCredits = Number(wallet?.balance_credits ?? 0);
  } catch (err) {
    if (!isSchemaFallbackError(err)) throw err;
  }

  try {
    const legacyAssignment = await loaders.loadLegacyAssignment();
    legacyAccessUntil = legacyAssignment?.legacy_access_until ?? null;
  } catch (err) {
    if (!isSchemaFallbackError(err)) throw err;
  }

  return { balanceCredits, legacyAccessUntil };
}

// GET /api/quota — returns current user's conversion quota status
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    const { balanceCredits, legacyAccessUntil } = await loadWalletSnapshot({
      loadWallet: async () => {
        const [wallet] = await sql`
          SELECT balance_credits
          FROM public.wallet_balances
          WHERE user_id = ${user.userId}
          LIMIT 1
        `;
        return wallet;
      },
      loadLegacyAssignment: async () => {
        const [legacyAssignment] = await sql`
          SELECT legacy_access_until
          FROM public.legacy_migration_assignments
          WHERE user_id = ${user.userId}
          ORDER BY assigned_at DESC
          LIMIT 1
        `;
        return legacyAssignment;
      },
    });

    return res.json(
      buildWalletQuotaPayload({
        role: user.role,
        balanceCredits,
        legacyAccessUntil,
      }),
    );
  } catch (err: any) {
    console.error('[quota/get]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
