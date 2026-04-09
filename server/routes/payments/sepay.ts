import { Router } from 'express';
import crypto from 'crypto';
import sql from '../../db';
import { requireAuth, invalidateProfileCache, ALL_FEATURES } from '../../auth';
import { getPackCredits } from '../../billing/rateCard';

const CHECKOUT_URL = 'https://pay.sepay.vn/v1/checkout/init';
type PlanId = 'reporter' | 'specialist' | 'officer';

const PLAN_AMOUNT_VND: Record<PlanId, number> = {
  reporter: 399_000,
  specialist: 299_000,
  officer: 499_000,
};

function isPlanId(v: unknown): v is PlanId {
  return v === 'reporter' || v === 'specialist' || v === 'officer';
}

function buildSignature(fields: Record<string, string>, secretKey: string): string {
  const order = [
    'merchant', 'operation', 'payment_method', 'order_amount', 'currency',
    'order_invoice_number', 'order_description', 'customer_id',
    'success_url', 'error_url', 'cancel_url',
  ];
  const parts = order.filter(k => fields[k] !== undefined).map(k => `${k}=${fields[k]}`);
  const hmac = crypto.createHmac('sha256', secretKey).update(parts.join(',')).digest();
  return Buffer.from(hmac).toString('base64');
}

export const sepayRouter = Router();

// POST /api/payments/sepay/create
sepayRouter.post('/create', requireAuth, async (req, res) => {
  const merchantId = process.env.SEPAY_MERCHANT_ID;
  const secretKey = process.env.SEPAY_SECRET_KEY;
  if (!merchantId || !secretKey) {
    return res.status(500).json({ error: 'Thiếu cấu hình SePay.' });
  }

  const userId = req.user!.userId;
  const email = req.user!.email;
  const planId: PlanId = isPlanId(req.body?.planId) ? req.body.planId : 'specialist';
  const amount = PLAN_AMOUNT_VND[planId];
  const orderId = `SP_${Date.now()}_${userId.slice(0, 8)}`;
  const appUrl = (process.env.APP_URL ?? 'https://meetingminutes.ai.vn').replace(/\/$/, '');

  try {
    await sql`
      INSERT INTO public.payment_orders
        (id, user_id, gateway, amount, currency, status, plan_granted, metadata)
      VALUES
        (${orderId}, ${userId}, 'sepay', ${amount}, 'VND', 'pending', ${planId},
         ${JSON.stringify({ email, plan: planId })}::jsonb)
    `;

    const fields: Record<string, string> = {
      merchant: merchantId,
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: orderId,
      order_amount: String(amount),
      currency: 'VND',
      order_description: `Nang cap goi ${planId} - ${email}`,
      customer_id: userId,
      success_url: `${appUrl}/payment/result?status=success&orderId=${orderId}&gateway=sepay`,
      error_url: `${appUrl}/payment/result?status=error&orderId=${orderId}&gateway=sepay`,
      cancel_url: `${appUrl}/pricing`,
    };
    fields.signature = buildSignature(fields, secretKey);

    return res.json({ orderId, checkoutUrl: CHECKOUT_URL, fields });
  } catch (err: any) {
    console.error('[sepay/create]', err);
    return res.status(500).json({ error: 'Không thể tạo đơn thanh toán.' });
  }
});

// POST /api/payments/sepay/webhook  (IPN from SePay)
sepayRouter.post('/webhook', async (req, res) => {
  const secretKey = process.env.SEPAY_SECRET_KEY;
  const provided = req.headers['x-secret-key'];
  if (secretKey && provided !== secretKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body ?? {};

  try {
    await sql`
      INSERT INTO public.payment_webhook_events (gateway, event_type, order_id, raw_payload)
      VALUES ('sepay', ${payload.notification_type ?? 'ipn'},
              ${payload.order?.order_invoice_number ?? null},
              ${JSON.stringify(payload)}::jsonb)
    `;
  } catch (e) {
    console.error('[sepay/webhook] log failed:', e);
  }

  if (payload.notification_type !== 'ORDER_PAID' || payload.order?.order_status !== 'CAPTURED') {
    return res.json({ success: true });
  }

  const orderId = payload.order?.order_invoice_number as string | undefined;
  if (!orderId) return res.json({ success: true });

  try {
    const [order] = await sql`
      SELECT id, user_id, status, plan_granted, metadata
      FROM public.payment_orders
      WHERE id = ${orderId} AND gateway = 'sepay'
      LIMIT 1
    `;
    if (!order || order.status === 'completed') return res.json({ success: true });

    const grantedPlan = order.plan_granted ?? order.metadata?.plan;
    const topupCredits = getPackCredits(grantedPlan);
    const gatewayTxnId = payload.transaction?.transaction_id ?? orderId;

    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE public.payment_orders
        SET status = 'completed', gateway_txn_id = ${gatewayTxnId}, updated_at = NOW()
        WHERE id = ${order.id}
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
        INSERT INTO public.wallet_ledger
          (user_id, event_type, action_type, amount_credits, balance_after_credits, correlation_id, metadata)
        VALUES
          (${order.user_id}, 'topup', NULL, ${topupCredits}, ${Math.round(Number(balance.balance_credits))},
           ${order.id}, ${JSON.stringify({ gateway: 'sepay', planId: grantedPlan, gatewayTxnId })}::jsonb)
      `;

      await tx`
        UPDATE public.profiles
        SET role = CASE WHEN role = 'admin' THEN role ELSE 'free' END,
            workflow_groups = CASE
              WHEN ${grantedPlan}::text IS NULL THEN COALESCE(workflow_groups, '{}'::text[])
              WHEN ${grantedPlan}::text = ANY(COALESCE(workflow_groups, '{}'::text[]))
                THEN COALESCE(workflow_groups, '{}'::text[])
              ELSE array_append(COALESCE(workflow_groups, '{}'::text[]), ${grantedPlan}::text)
            END,
            features = ${sql.array(ALL_FEATURES)},
            updated_at = NOW()
        WHERE user_id = ${order.user_id}
      `;
    });

    invalidateProfileCache(order.user_id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[sepay/webhook]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});
