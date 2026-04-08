-- Track which UTC calendar month (YYYY-MM) the free-tier monthly allowance was last applied.
-- Needed when balance is already >= floor so no wallet_ledger row is written.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_allowance_period_utc text NULL;
