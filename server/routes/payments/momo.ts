// server/routes/payments/momo.ts
// MoMo AIO (All-In-One) e-wallet integration — no npm package needed.
// Uses Node.js crypto module for HMAC-SHA256 signatures.
// Docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/

import { Router } from 'express';
import crypto from 'crypto';
import sql from '../../db';
import { requireAuth, invalidateProfileCache, ALL_FEATURES } from '../../auth';

const AMOUNT_VND = 99_000;
const MOMO_ENDPOINT =
  process.env.NODE_ENV === 'production'
    ? 'https://payment.momo.vn/v2/gateway/api/create'
    : 'https://test-payment.momo.vn/v2/gateway/api/create';

// HMAC-SHA256 helper
function hmacSha256(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

// Create request signature — field order is FIXED per MoMo v3 docs.
// DO NOT sort alphabetically. The order below is mandatory.
export function generateCreateSignature(params: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}): string {
  const raw = [
    `accessKey=${params.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `ipnUrl=${params.ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${params.partnerCode}`,
    `redirectUrl=${params.redirectUrl}`,
    `requestId=${params.requestId}`,
    `requestType=${params.requestType}`,
  ].join('&');
  return hmacSha256(raw, params.secretKey);
}

// IPN callback signature verification — field order is FIXED per MoMo v3 docs.
// IMPORTANT: verify this order against developers.momo.vn/v3 at implementation time.
// Order changed between v1 and v3 — old blog posts show wrong order.
export function generateIpnSignature(params: {
  accessKey: string;
  amount: number | string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: number | string;
  resultCode: number | string;
  transId: number | string;
  secretKey: string;
}): string {
  const raw = [
    `accessKey=${params.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `message=${params.message}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `orderType=${params.orderType}`,
    `partnerCode=${params.partnerCode}`,
    `payType=${params.payType}`,
    `requestId=${params.requestId}`,
    `responseTime=${params.responseTime}`,
    `resultCode=${params.resultCode}`,
    `transId=${params.transId}`,
  ].join('&');
  return hmacSha256(raw, params.secretKey);
}

export const momoRouter = Router();

// POST /api/payments/momo/create
// Requires auth. Creates pending order in DB then calls MoMo API to get payUrl.
momoRouter.post('/create', requireAuth, async (req, res) => {
  const PARTNER_CODE = process.env.MOMO_PARTNER_CODE!;
  const ACCESS_KEY = process.env.MOMO_ACCESS_KEY!;
  const SECRET_KEY = process.env.MOMO_SECRET_KEY!;
  const APP_URL = process.env.APP_URL!;

  const userId = req.user!.userId;
  const email = req.user!.email;
  const orderId = `MOMO_${Date.now()}_${userId.slice(0, 8)}`;
  const requestId = orderId;
  const orderInfo = `Nang cap tai khoan ${email}`;
  const redirectUrl = `${APP_URL}/payment/result`;
  const ipnUrl = `${APP_URL}/api/payments/momo/ipn`;
  const requestType = 'captureWallet';
  // extraData: base64-encoded JSON for passing userId through the payment flow
  const extraData = Buffer.from(JSON.stringify({ userId })).toString('base64');

  try {
    const signature = generateCreateSignature({
      accessKey: ACCESS_KEY,
      amount: AMOUNT_VND,
      extraData,
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode: PARTNER_CODE,
      redirectUrl,
      requestId,
      requestType,
      secretKey: SECRET_KEY,
    });

    const body = JSON.stringify({
      partnerCode: PARTNER_CODE,
      accessKey: ACCESS_KEY,
      requestId,
      amount: AMOUNT_VND,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      signature,
      lang: 'vi',
    });

    // Insert pending order BEFORE API call — ensures record exists if IPN arrives fast
    await sql`
      INSERT INTO public.payment_orders
        (id, user_id, gateway, amount, currency, status, plan_granted, metadata)
      VALUES
        (${orderId}, ${userId}, 'momo', ${AMOUNT_VND}, 'VND', 'pending', 'user',
         ${JSON.stringify({ email, plan: 'user' })}::jsonb)
    `;

    // 30s timeout per MoMo docs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let data: any;
    try {
      const response = await fetch(MOMO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (data.resultCode !== 0) {
      await sql`
        UPDATE public.payment_orders SET status = 'failed', updated_at = NOW()
        WHERE id = ${orderId}
      `;
      return res.status(400).json({ error: data.message ?? 'MoMo payment creation failed' });
    }

    return res.json({ payUrl: data.payUrl });
  } catch (err: any) {
    console.error('[momo/create]', err);
    return res.status(500).json({ error: 'Không thể tạo liên kết thanh toán MoMo' });
  }
});

// POST /api/payments/momo/ipn
// Server-to-server callback from MoMo. AUTHORITATIVE for role upgrade.
// Must respond promptly. MoMo does not retry as aggressively as VNPay but may resend.
momoRouter.post('/ipn', async (req, res) => {
  const {
    partnerCode, orderId, requestId, amount, orderInfo, orderType,
    transId, resultCode, message, payType, responseTime, extraData, signature,
  } = req.body ?? {};

  // Log raw payload for audit trail BEFORE processing
  try {
    await sql`
      INSERT INTO public.payment_webhook_events (gateway, event_type, order_id, raw_payload)
      VALUES ('momo', 'ipn', ${orderId ?? null}, ${JSON.stringify(req.body)}::jsonb)
    `;
  } catch (logErr) {
    console.error('[momo/ipn] webhook log failed:', logErr);
  }

  const ACCESS_KEY = process.env.MOMO_ACCESS_KEY!;
  const SECRET_KEY = process.env.MOMO_SECRET_KEY!;

  // Verify signature — reject tampered callbacks
  const expectedSig = generateIpnSignature({
    accessKey: ACCESS_KEY,
    amount,
    extraData: extraData ?? '',
    message: message ?? '',
    orderId,
    orderInfo: orderInfo ?? '',
    orderType: orderType ?? '',
    partnerCode,
    payType: payType ?? '',
    requestId,
    responseTime,
    resultCode,
    transId,
    secretKey: SECRET_KEY,
  });

  if (signature !== expectedSig) {
    console.warn('[momo/ipn] invalid signature for orderId:', orderId);
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    // Failed payment — just mark order as failed, no role upgrade
    if (resultCode !== 0) {
      if (orderId) {
        await sql`
          UPDATE public.payment_orders
          SET status = 'failed', updated_at = NOW()
          WHERE id = ${orderId}
        `;
      }
      return res.json({ message: 'Acknowledged' });
    }

    // Idempotency check
    const [order] = await sql`
      SELECT id, user_id, amount, status
      FROM public.payment_orders
      WHERE id = ${orderId}
    `;

    if (!order) {
      console.warn('[momo/ipn] order not found:', orderId);
      return res.json({ message: 'OK' });
    }

    if (order.status === 'completed') {
      return res.json({ message: 'OK' });
    }

    // Atomic upgrade in single transaction
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE public.payment_orders
        SET status = 'completed',
            gateway_txn_id = ${String(transId)},
            updated_at = NOW()
        WHERE id = ${orderId}
      `;
      // CRITICAL: Update BOTH role AND features — features drives feature access in requireAuth middleware
      await tx`
        UPDATE public.profiles
        SET role = 'user',
            features = ${sql.array(ALL_FEATURES)},
            updated_at = NOW()
        WHERE user_id = ${order.user_id}
      `;
    });

    // Invalidate 30s profile cache so next request reads upgraded role
    invalidateProfileCache(order.user_id);

    return res.json({ message: 'OK' });
  } catch (err: any) {
    console.error('[momo/ipn]', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});
