import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { ensureFreeMonthlyAllowance } from '../billing/freeMonthlyAllowance';

const router = Router();

const DEFAULT_FREE_DAILY_LIMIT = 1;
const DEFAULT_OVERDRAFT_LIMIT = 0;

interface WalletSnapshot {
  balanceCredits: number;
  legacyAccessUntil: string | null;
}

type DbLoader = {
  loadWallet: () => Promise<{ balance_credits?: number | null } | null>;
  loadLegacyAssignment: () => Promise<{ legacy_access_until?: string | null } | null>;
};

export function buildWalletQuotaPayload(input: {
  role: string;
  balanceCredits?: number | null;
  legacyAccessUntil?: string | null;
}) {
  return {
    role: input.role,
    billingModel: 'wallet' as const,
    balance: Number(input.balanceCredits ?? 0),
    overdraftLimit: DEFAULT_OVERDRAFT_LIMIT,
    legacyAccessUntil: input.legacyAccessUntil ?? null,
  };
}

export function isSchemaFallbackError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === '42P01' || code === '42703';
}

export async function loadWalletSnapshot(loaders: DbLoader): Promise<WalletSnapshot> {
  try {
    const wallet = await loaders.loadWallet();
    const legacy = await loaders.loadLegacyAssignment();
    return {
      balanceCredits: Number(wallet?.balance_credits ?? 0),
      legacyAccessUntil: legacy?.legacy_access_until ?? null,
    };
  } catch (err) {
    if (isSchemaFallbackError(err)) {
      return { balanceCredits: 0, legacyAccessUntil: null };
    }
    throw err;
  }
}

// GET /api/quota — returns current user's conversion quota status
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    await ensureFreeMonthlyAllowance(user.userId);
    const snapshot = await loadWalletSnapshot({
      loadWallet: async () => {
        const [wallet] = await sql`
          SELECT balance_credits
          FROM public.wallet_balances
          WHERE user_id = ${user.userId}
        `;
        return wallet ?? null;
      },
      loadLegacyAssignment: async () => {
        const [legacy] = await sql`
          SELECT legacy_access_until
          FROM public.legacy_migration_assignments
          WHERE user_id = ${user.userId}
        `;
        return legacy ?? null;
      },
    });

    return res.json(
      buildWalletQuotaPayload({
        role: user.role,
        balanceCredits: snapshot.balanceCredits,
        legacyAccessUntil: snapshot.legacyAccessUntil,
      }),
    );
  } catch (err: any) {
    // Backward compatibility fallback if wallet schema is unavailable.
    if (user.role === 'free' && isSchemaFallbackError(err)) {
      try {
        const [result] = await sql`
          SELECT
            COALESCE(p.daily_limit, ${DEFAULT_FREE_DAILY_LIMIT}) AS daily_limit,
            COALESCE(d.count, 0) AS used
          FROM public.profiles p
          LEFT JOIN public.daily_conversion_usage d
            ON d.user_id = p.user_id AND d.usage_date = CURRENT_DATE
          WHERE p.user_id = ${user.userId}
        `;
        const dailyLimit = result?.daily_limit ?? DEFAULT_FREE_DAILY_LIMIT;
        const used = result?.used ?? 0;
        return res.json({
          role: 'free',
          used,
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - used),
        });
      } catch (fallbackErr: any) {
        console.error('[quota/get-fallback]', fallbackErr);
      }
    }
    console.error('[quota/get]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
