// server/routes/payments/vnpay.ts
import { Router } from 'express';
import { VNPay, HashAlgorithm } from 'vnpay';
import type { ReturnQueryFromVNPay } from 'vnpay';
import sql from '../../db';
import { requireAuth, invalidateProfileCache, ALL_FEATURES } from '../../auth';
import { getPackPrice, getPackCredits } from '../../billing/rateCard';
import { CREDIT_PACK_IDS, type CreditPackId } from '../../billing/types';

type VnpayCreateChannel = 'intl_card' | 'domestic_bank';
type PlanId = CreditPackId;

function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && CREDIT_PACK_IDS.includes(value as PlanId);
}

function pickGrantedPlan(order: { plan_granted?: unknown; metadata?: Record<string, unknown> }): PlanId | null {
  if (isPlanId(order.plan_granted)) return order.plan_granted;
  if (isPlanId(order.metadata?.plan)) return order.metadata.plan;
  return null;
}

function resolveVnpayBankCode(channel: unknown): 'INTCARD' | 'VNBANK' | undefined {
  if (channel === 'intl_card') return 'INTCARD';
  if (channel === 'domestic_bank') return 'VNBANK';
  return undefined;
}

function getVnpayClient() {
  return new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE!,
    secureSecret: process.env.VNPAY_SECURE_SECRET!,
    vnpayHost: process.env.NODE_ENV === 'production'
      ? 'https://pay.vnpay.vn'
      : 'https://sandbox.vnpayment.vn',
    testMode: process.env.NODE_ENV !== 'production',
    hashAlgorithm: HashAlgorithm.SHA512,
  });
}

export const vnpayRouter = Router();

export async function applyVnpayPaymentSuccess(orderId: string, gatewayTxnId: string): Promise<{ processed: boolean }> {
  let userId = '';
  let alreadyProcessed = false;

  await sql.begin(async (tx: any) => {
    const [order] = await tx`
      SELECT id, user_id, status, plan_granted, metadata
      FROM public.payment_orders
      WHERE id = ${orderId}
      FOR UPDATE
    `;

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    userId = order.user_id;

    if (order.status === 'completed') {
      alreadyProcessed = true;
      return;
    }

    const grantedPlan = pickGrantedPlan(order);
    if (!grantedPlan) {
      throw new Error('INVALID_PLAN');
    }

    const topupCredits = getPackCredits(grantedPlan);

    await tx`
      UPDATE public.payment_orders
      SET status = 'completed',
          gateway_txn_id = ${gatewayTxnId},
          updated_at = NOW()
      WHERE id = ${orderId}
    `;

    const [balance] = await tx`
      INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
      VALUES (${order.user_id}, ${topupCredits}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET balance_credits = public.wallet_balances.balance_credits + ${topupCredits},
          updated_at = NOW()
      RETURNING balance_credits
    `;

    await tx`
      INSERT INTO public.wallet_ledger (
        user_id,
        event_type,
        action_type,
        amount_credits,
        balance_after_credits,
        correlation_id,
        metadata
      ) VALUES (
        ${order.user_id},
        'topup',
        NULL,
        ${topupCredits},
        ${balance.balance_credits},
        ${order.id},
        ${JSON.stringify({ gateway: 'vnpay', planId: grantedPlan, gatewayTxnId })}::jsonb
      )
    `;

    await tx`
      UPDATE public.profiles
      SET role = CASE WHEN role = 'admin' THEN role ELSE 'free' END,
          workflow_groups = CASE
            WHEN ${grantedPlan}::text = ANY(COALESCE(workflow_groups, '{}'::text[]))
              THEN COALESCE(workflow_groups, '{}'::text[])
            ELSE array_append(COALESCE(workflow_groups, '{}'::text[]), ${grantedPlan}::text)
          END,
          features = ${sql.array(ALL_FEATURES)},
          updated_at = NOW()
      WHERE user_id = ${order.user_id}
    `;
  });

  if (userId) invalidateProfileCache(userId);
  return { processed: !alreadyProcessed };
}

// POST /api/payments/vnpay/create
// Requires auth. Creates pending order in DB then returns signed VNPay URL.
vnpayRouter.post('/create', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  const requestedChannel = req.body?.channel as VnpayCreateChannel | undefined;
  const requestedPlanId = req.body?.planId;
  const planId: PlanId = isPlanId(requestedPlanId) ? requestedPlanId : 'specialist';
  const amountVnd = getPackPrice(planId);
  const vnpayBankCode = resolveVnpayBankCode(requestedChannel);
  const orderId = `ORD_${Date.now()}_${userId.slice(0, 8)}`;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '127.0.0.1';

  try {
    // Insert pending order as idempotency anchor BEFORE calling gateway
    await sql`
      INSERT INTO public.payment_orders
        (id, user_id, gateway, amount, currency, status, plan_granted, metadata)
      VALUES
        (${orderId}, ${userId}, 'vnpay', ${amountVnd}, 'VND', 'pending', ${planId},
         ${JSON.stringify({ email, plan: planId, channel: requestedChannel ?? null })}::jsonb)
    `;

    const vnpay = getVnpayClient();
    const paymentPayload = {
      vnp_Amount: amountVnd,
      vnp_IpAddr: clientIp,
      vnp_ReturnUrl: `${process.env.APP_URL}/api/payments/vnpay/return`,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Nang cap tai khoan ${email}`,
      ...(vnpayBankCode ? { vnp_BankCode: vnpayBankCode } : {}),
    };
    const paymentUrl = vnpay.buildPaymentUrl(paymentPayload);

    return res.json({ paymentUrl });
  } catch (err: any) {
    console.error('[vnpay/create]', err);
    return res.status(500).json({ error: 'Khong the tao lien ket thanh toan VNPay' });
  }
});

// GET /api/payments/vnpay/return
// Browser redirect from VNPay after payment. UI display ONLY — do not upgrade role here.
// IPN (/ipn) is authoritative. This just redirects the user to the result page.
vnpayRouter.get('/return', async (req, res) => {
  try {
    const vnpay = getVnpayClient();
    const verify = vnpay.verifyReturnUrl(req.query as unknown as ReturnQueryFromVNPay);
    const status = verify.isSuccess ? 'success' : 'failed';
    return res.redirect(`${process.env.APP_URL}/payment/result?status=${status}`);
  } catch (err: any) {
    console.error('[vnpay/return]', err);
    return res.redirect(`${process.env.APP_URL}/payment/result?status=error`);
  }
});

// POST /api/payments/vnpay/ipn
// Server-to-server callback from VNPay. AUTHORITATIVE for role upgrade.
// Must respond within 5 seconds. Must return RspCode:'00' even on already-processed orders.
vnpayRouter.post('/ipn', async (req, res) => {
  const orderId = (req.query.vnp_TxnRef ?? req.body?.vnp_TxnRef) as string | undefined;

  // Log raw payload for audit trail BEFORE processing
  try {
    await sql`
      INSERT INTO public.payment_webhook_events (gateway, event_type, order_id, raw_payload)
      VALUES ('vnpay', 'ipn', ${orderId ?? null}, ${JSON.stringify(req.query)}::jsonb)
    `;
  } catch (logErr) {
    // Non-fatal — continue processing even if logging fails
    console.error('[vnpay/ipn] webhook log failed:', logErr);
  }

  try {
    const vnpay = getVnpayClient();
    const verify = vnpay.verifyIpnCall(req.query as unknown as ReturnQueryFromVNPay);

    if (!verify.isSuccess) {
      return res.json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const txnRef = verify.vnp_TxnRef;

    const [order] = await sql`
      SELECT id, user_id, amount, status
      FROM public.payment_orders
      WHERE id = ${txnRef}
    `;

    if (!order) {
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Idempotency: return success without re-processing (VNPay retries expect '00')
    if (order.status === 'completed') {
      return res.json({ RspCode: '00', Message: 'Already processed' });
    }

    // Amount verification (vnpay lib returns raw VND — compare directly)
    if (Number(verify.vnp_Amount) !== order.amount) {
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    await applyVnpayPaymentSuccess(txnRef, String(verify.vnp_TransactionNo));

    return res.json({ RspCode: '00', Message: 'Success' });
  } catch (err: any) {
    console.error('[vnpay/ipn]', err);
    // Return 99 so VNPay retries — do NOT return 00 on actual errors
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});
