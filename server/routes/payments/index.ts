// server/routes/payments/index.ts
// Central payments router. VNPay and MoMo sub-routers are registered in later plans.
// This file only contains the check-upgrade endpoint (Wave 0 infra).

import { Router } from 'express';
import sql from '../../db';
import {
  requireAuth,
  signToken,
  invalidateProfileCache,
  FREE_FEATURES,
  COOKIE_OPTIONS,
  type Feature,
} from '../../auth';
import { LEGACY_OVERDRAFT_FLOOR_CREDITS } from '../../billing/legacyAccessPolicy';

export const paymentsRouter = Router();

// POST /api/payments/check-upgrade
// Called by frontend PaymentResultPage after a successful payment redirect.
// Clears the 30s profileCache for this user and issues a fresh JWT with the upgraded role.
// This resolves the stale-token problem: DB has role='user' but JWT still says 'free'.
paymentsRouter.post('/check-upgrade', requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    // 1. Clear stale cache so DB is queried fresh
    invalidateProfileCache(userId);

    // 2. Fetch current role from DB
    const [profile] = await sql`
      SELECT role, workflow_groups, features
      FROM public.profiles
      WHERE user_id = ${userId}
    `;

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const role = profile.role ?? 'free';
    const plans: string[] = profile.workflow_groups ?? [];
    const features: Feature[] = profile.features?.length ? profile.features : FREE_FEATURES;
    const [wallet] = await sql`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const [legacyAssignment] = await sql`
      SELECT legacy_access_until
      FROM public.legacy_migration_assignments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const balance = Number(wallet?.balance_credits ?? 0);
    const overdraftLimit = LEGACY_OVERDRAFT_FLOOR_CREDITS;
    const legacyAccessUntil = legacyAssignment?.legacy_access_until ?? null;

    // 3. Issue fresh token with DB-accurate role
    const freshUser = { userId, email: req.user!.email, role, plans, features };
    const token = signToken(freshUser);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });

    return res.json({
      token,
      user: freshUser,
      balance,
      overdraftLimit,
      legacyAccessUntil,
      wallet: {
        balance,
        overdraftLimit,
        legacyAccessUntil,
      },
    });
  } catch (err: any) {
    console.error('[payments/check-upgrade]', err);
    return res.status(500).json({ error: 'Da xay ra loi. Vui long thu lai sau.' });
  }
});
