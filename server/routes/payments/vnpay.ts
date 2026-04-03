// server/routes/payments/vnpay.ts
import { Router } from 'express';
import { VNPay, HashAlgorithm } from 'vnpay';
import type { ReturnQueryFromVNPay } from 'vnpay';
import sql from '../../db';
import { requireAuth, invalidateProfileCache, ALL_FEATURES } from '../../auth';

const AMOUNT_VND = 99_000; // Subscription price in VND

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

// POST /api/payments/vnpay/create
// Requires auth. Creates pending order in DB then returns signed VNPay URL.
vnpayRouter.post('/create', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  const orderId = `ORD_${Date.now()}_${userId.slice(0, 8)}`;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '127.0.0.1';

  try {
    // Insert pending order as idempotency anchor BEFORE calling gateway
    await sql`
      INSERT INTO public.payment_orders
        (id, user_id, gateway, amount, currency, status, plan_granted, metadata)
      VALUES
        (${orderId}, ${userId}, 'vnpay', ${AMOUNT_VND}, 'VND', 'pending', 'user',
         ${JSON.stringify({ email, plan: 'user' })}::jsonb)
    `;

    const vnpay = getVnpayClient();
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: AMOUNT_VND,
      vnp_IpAddr: clientIp,
      vnp_ReturnUrl: `${process.env.APP_URL}/api/payments/vnpay/return`,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Nang cap tai khoan ${email}`,
    });

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

    // Atomic upgrade: update order + profile in single transaction
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE public.payment_orders
        SET status = 'completed',
            gateway_txn_id = ${String(verify.vnp_TransactionNo)},
            updated_at = NOW()
        WHERE id = ${txnRef}
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

    // Invalidate 30s profile cache so next request reads upgraded role from DB
    invalidateProfileCache(order.user_id);

    return res.json({ RspCode: '00', Message: 'Success' });
  } catch (err: any) {
    console.error('[vnpay/ipn]', err);
    // Return 99 so VNPay retries — do NOT return 00 on actual errors
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});
