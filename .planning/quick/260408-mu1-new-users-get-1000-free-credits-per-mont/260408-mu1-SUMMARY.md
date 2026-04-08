# Quick 260408-mu1 — Summary

## Done

- Added `server/billing/freeMonthlyAllowance.ts`: **1000 credits** per **UTC calendar month** for users with `profiles.role = 'free'` and **no** `workflow_groups` (paid packs keep role `free` but have plans — they are excluded).
- Idempotency: one `wallet_ledger` row per month via `correlation_id` `free-allowance:{userId}:{YYYY-MM}` (`topup` + metadata `free_monthly_allowance`).
- Wired: registration transaction (`ensureFreeMonthlyAllowanceInTx`), login, refresh, `GET /api/quota`, and `authorizeAndCharge` (via `ensureFreeMonthlyAllowance`).
- Integration tests: `server/billing/__tests__/freeMonthlyAllowance.integration.test.ts`; `vitest.integration.config.ts` includes that path.

## Verify

- `npm test` (unit) — pass.
- `npm run test:integration` — new file passes; some unrelated integration tests may fail in dirty DB.

## Git

- Feature + planning artifacts: `d21ce3a`
- STATE hash row + SUMMARY note: `e43b607`
