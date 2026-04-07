-- Migration 014: Wallet ledger foundation + billing rate card
-- Purpose:
-- 1) Lock fixed credit packs (D-02)
-- 2) Lock billable action costs (D-04)
-- 3) Provide auditable append-only wallet model (D-01)

CREATE TABLE IF NOT EXISTS public.wallet_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN ('topup', 'debit', 'refund', 'migration_grant', 'migration_expire', 'adjustment')
  ),
  action_type text,
  pack_id text,
  amount_credits integer NOT NULL CHECK (amount_credits <> 0),
  balance_after_credits integer NOT NULL,
  correlation_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_ledger_correlation_id
  ON public.wallet_ledger(correlation_id);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON public.wallet_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_pack_catalog (
  pack_id text PRIMARY KEY,
  price_vnd integer NOT NULL CHECK (price_vnd > 0),
  credits integer NOT NULL CHECK (credits > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_rate_card (
  action_type text PRIMARY KEY,
  cost_credits integer NOT NULL CHECK (cost_credits > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Guard rails: prevent mutation/deletion for append-only ledger.
CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only; % is not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_ledger_no_update ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_no_update
BEFORE UPDATE ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

DROP TRIGGER IF EXISTS trg_wallet_ledger_no_delete ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_no_delete
BEFORE DELETE ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

INSERT INTO public.credit_pack_catalog (pack_id, price_vnd, credits, active)
VALUES
  ('specialist', 299000, 299000, true),
  ('reporter', 399000, 399000, true),
  ('officer', 499000, 499000, true)
ON CONFLICT (pack_id) DO UPDATE
SET price_vnd = EXCLUDED.price_vnd,
    credits = EXCLUDED.credits,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO public.billing_rate_card (action_type, cost_credits, active)
VALUES
  ('minutes-generate', 10000, true)
ON CONFLICT (action_type) DO UPDATE
SET cost_credits = EXCLUDED.cost_credits,
    active = EXCLUDED.active,
    updated_at = NOW();
