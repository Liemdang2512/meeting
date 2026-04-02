-- Migration 013: Add payment tables for VNPay + MoMo integration
-- Idempotent: uses IF NOT EXISTS throughout

-- Orders: one record per payment attempt
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id             text PRIMARY KEY,           -- e.g. "ORD_1712345678_abcd1234" or "MOMO_..."
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway        text NOT NULL,              -- 'vnpay' | 'momo'
  amount         integer NOT NULL,           -- in VND, no decimals (e.g. 99000)
  currency       text NOT NULL DEFAULT 'VND',
  status         text NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'expired'
  gateway_txn_id text,                       -- VNPay: vnp_TransactionNo, MoMo: transId
  plan_granted   text DEFAULT 'user',        -- role to grant on success
  metadata       jsonb,                      -- arbitrary order context (email, plan, etc.)
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz
);

-- Webhook audit log: every inbound IPN call logged before processing
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway      text NOT NULL,               -- 'vnpay' | 'momo'
  event_type   text,                        -- 'ipn' | 'return'
  order_id     text,                        -- references payment_orders.id (not FK — log even unknown orders)
  raw_payload  jsonb NOT NULL,              -- full req.query or req.body at time of receipt
  processed    boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
  ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status
  ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at
  ON public.payment_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id
  ON public.payment_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_created_at
  ON public.payment_webhook_events(gateway, created_at DESC);
