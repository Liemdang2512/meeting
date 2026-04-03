# Phase 10: Payment Gateway Integration - Research

**Researched:** 2026-04-02
**Domain:** Vietnam payment gateways — MoMo, VNPay, Visa/Mastercard via OnePAY/redirect; Node.js + Express backend
**Confidence:** HIGH (MoMo/VNPay), MEDIUM (Visa/Mastercard via OnePAY), HIGH (PayOS clarification)

---

## Summary

Phase 10 requires integrating real payment processing for a Vietnamese SaaS app. The market has three distinct payment segments: domestic bank transfer (PayOS/VietQR), domestic e-wallet (MoMo), and card-based domestic+international gateway (VNPay or OnePAY). There is no single gateway that handles all three cleanly — this is the central architectural decision.

**Stripe is not available for Vietnam-registered businesses.** Vietnamese business accounts cannot open Stripe directly. The workaround requires a foreign company registration (US LLC or UK Ltd), which is out of scope for this project.

**PayOS is NOT suitable for card payments.** PayOS is a A2A (Account-to-Account) bank transfer gateway using VietQR only. It does not support Visa, Mastercard, MoMo, or VNPay. It is excellent for domestic bank QR but cannot replace the card requirement.

**Primary recommendation:** Use two gateways — **VNPay** for Visa/Mastercard + VNPay QR (single registration, single integration covers both card and QR), and **MoMo** as a separate e-wallet gateway. This is the minimum viable multi-method stack requiring only two merchant registrations. VNPay alone can fulfill the Visa/Mastercard requirement because VNPay's international gateway (vnpayment.vn) supports Visa/Mastercard/JCB in addition to domestic ATM cards.

---

## 1. Recommended Stack / Architecture

### Decision: Two Gateways, Not Three or One

| Gateway | Covers | Registration | SDK |
|---------|--------|--------------|-----|
| **VNPay** | Visa, Mastercard, JCB, domestic ATM, VNPay QR | sandbox.vnpayment.vn free sandbox; production at vnpayment.vn | `vnpay` npm package v2.4.4 |
| **MoMo** | MoMo e-wallet | developers.momo.vn merchant registration | Raw HTTP + Node.js `crypto` module |

**Why not three gateways?**
VNPay's international payment channel already handles Visa/Mastercard. Adding OnePAY separately means a third merchant agreement, a third webhook endpoint, and a third secret management concern with no user-facing benefit. Keep it at two.

**Why not PayOS for the bank transfer fallback?**
PayOS only does VietQR bank transfer. If the team wants to add "pay by bank transfer" later, PayOS is appropriate. For Phase 10 (upgrade a paid plan), card + MoMo wallet is sufficient and reaches the widest audience. PayOS can be Phase 11 if needed.

---

## 2. Visa/Mastercard Integration

### Recommended: VNPay International Channel

VNPay has two modes:
- **Domestic ATM card**: redirects to bank ATM gateway
- **International card (Visa/Mastercard/JCB)**: uses VNPay's card processing

Both modes are accessed through the same API endpoint and distinguished by the `vnp_BankCode` parameter (leave empty = user picks at VNPay's hosted page).

**Registration path:**
1. Go to `https://sandbox.vnpayment.vn/devreg/` — free sandbox registration
2. Receive `tmnCode` and `secureSecret` immediately after registration
3. For production: apply at `vnpayment.vn` as a merchant, provide business documents

**Test card (sandbox):**
- Bank: NCB
- Card number: `9704198526191432198`
- Holder: `NGUYEN VAN A`
- Issue date: `07/15`
- OTP: `123456`

**npm package:**
```bash
npm install vnpay
```
Current version: **2.4.4** (verified 2026-04-02 via `npm view vnpay version`)

**Confidence:** HIGH — verified via official library docs at vnpay.js.org and npm registry.

---

## 3. VNPay Integration

### Flow

VNPay uses a **redirect flow**:
1. Backend builds a signed payment URL
2. User is redirected to VNPay hosted payment page
3. User pays on VNPay's page (no card data touches your server — PCI scope eliminated)
4. VNPay sends two notifications:
   - **Return URL** (GET, browser redirect): for UI display only — NOT for business logic
   - **IPN URL** (POST, server-to-server): for updating DB and upgrading role — authoritative

**Critical: Never upgrade user role on Return URL. Always use IPN URL.**

### Backend Code Pattern (Express + TypeScript)

```typescript
// server/routes/payments/vnpay.ts
import { VNPay } from 'vnpay';

const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE!,
  secureSecret: process.env.VNPAY_SECURE_SECRET!,
  vnpayHost: process.env.NODE_ENV === 'production'
    ? 'https://pay.vnpay.vn'
    : 'https://sandbox.vnpayment.vn',
  testMode: process.env.NODE_ENV !== 'production',
  hashAlgorithm: 'SHA512',
});

// POST /api/payments/vnpay/create
router.post('/create', requireAuth, async (req, res) => {
  const orderId = `ORD_${Date.now()}_${req.user!.userId.slice(0,8)}`;

  // Insert pending order into DB first (idempotency anchor)
  await sql`
    INSERT INTO public.payment_orders
      (id, user_id, gateway, amount, currency, status, metadata)
    VALUES
      (${orderId}, ${req.user!.userId}, 'vnpay', ${99000}, 'VND', 'pending', ${JSON.stringify({ plan: 'user' })})
  `;

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: 99000,          // amount in VND
    vnp_IpAddr: req.ip!,
    vnp_ReturnUrl: `${process.env.APP_URL}/payment/result`,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Nang cap tai khoan ${req.user!.email}`,
  });

  res.json({ paymentUrl });
});

// GET /api/payments/vnpay/return  (browser redirect — UI only)
router.get('/return', async (req, res) => {
  const verify = vnpay.verifyReturnUrl(req.query as any);
  // Only show status to user — DB is updated by IPN
  res.redirect(`/payment/result?status=${verify.isSuccess ? 'success' : 'failed'}`);
});

// POST /api/payments/vnpay/ipn  (server-to-server — authoritative)
router.post('/ipn', async (req, res) => {
  const verify = vnpay.verifyIpnCall(req.query as any);

  if (!verify.isSuccess) {
    return res.json({ RspCode: '97', Message: 'Checksum failed' });
  }

  const orderId = verify.vnp_TxnRef;

  // Idempotency: check if already processed
  const [order] = await sql`
    SELECT * FROM public.payment_orders WHERE id = ${orderId}
  `;

  if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });
  if (order.status === 'completed') return res.json({ RspCode: '02', Message: 'Already processed' }); // NOT error — VNPay retries
  if (Number(verify.vnp_Amount) !== order.amount) return res.json({ RspCode: '04', Message: 'Invalid amount' });

  // Upgrade user role in a single transaction
  await sql.begin(async sql => {
    await sql`UPDATE public.payment_orders SET status = 'completed', gateway_txn_id = ${verify.vnp_TransactionNo} WHERE id = ${orderId}`;
    await sql`UPDATE public.profiles SET role = 'user', updated_at = NOW() WHERE user_id = ${order.user_id}`;
  });

  // Invalidate profile cache (server/auth.ts uses 30s TTL cache)
  profileCache.delete(order.user_id);

  return res.json({ RspCode: '00', Message: 'Success' });
});
```

### Environment Variables Required
```
VNPAY_TMN_CODE=2QXUI4B4         # from sandbox registration
VNPAY_SECURE_SECRET=your_secret  # from sandbox registration
```

**Confidence:** HIGH — code pattern from official vnpay library docs (vnpay.js.org) and Express example in repository.

---

## 4. MoMo Integration

### Flow

MoMo uses a **redirect flow** (AIO = All-In-One):
1. Backend calls MoMo REST API to create a payment transaction
2. MoMo returns a `payUrl`
3. User is redirected to `payUrl` (MoMo hosted page or app deeplink)
4. MoMo sends:
   - **redirectUrl** (GET, browser redirect): for UI display
   - **ipnUrl** (POST, server-to-server): authoritative, verify before acting

**API Endpoint (sandbox):** `https://test-payment.momo.vn/v2/gateway/api/create`
**API Endpoint (production):** `https://payment.momo.vn/v2/gateway/api/create`

### Signature Generation (HMAC-SHA256)

```
rawSignature = "accessKey={accessKey}&amount={amount}&extraData={extraData}&ipnUrl={ipnUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={partnerCode}&redirectUrl={redirectUrl}&requestId={requestId}&requestType={requestType}"
signature = HMAC-SHA256(rawSignature, secretKey)
```

Note: parameters must be in **exactly this alphabetical order** — do not sort, use the fixed order above.

### Backend Code Pattern (Node.js crypto — no SDK needed)

```typescript
// server/routes/payments/momo.ts
import crypto from 'crypto';
import https from 'https';

const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE!;
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY!;
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY!;
const MOMO_ENDPOINT = process.env.NODE_ENV === 'production'
  ? 'https://payment.momo.vn/v2/gateway/api/create'
  : 'https://test-payment.momo.vn/v2/gateway/api/create';
const APP_URL = process.env.APP_URL!;

// POST /api/payments/momo/create
router.post('/create', requireAuth, async (req, res) => {
  const orderId = `MOMO_${Date.now()}_${req.user!.userId.slice(0,8)}`;
  const requestId = orderId; // Can be same as orderId
  const amount = 99000;
  const orderInfo = `Nang cap tai khoan ${req.user!.email}`;
  const redirectUrl = `${APP_URL}/payment/result`;
  const ipnUrl = `${APP_URL}/api/payments/momo/ipn`;
  const requestType = 'captureWallet';
  const extraData = Buffer.from(JSON.stringify({ userId: req.user!.userId })).toString('base64');

  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${MOMO_PARTNER_CODE}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = crypto
    .createHmac('sha256', MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest('hex');

  const body = JSON.stringify({
    partnerCode: MOMO_PARTNER_CODE,
    accessKey: MOMO_ACCESS_KEY,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    signature,
    lang: 'vi',
  });

  // Insert pending order before calling MoMo API
  await sql`
    INSERT INTO public.payment_orders (id, user_id, gateway, amount, currency, status, metadata)
    VALUES (${orderId}, ${req.user!.userId}, 'momo', ${amount}, 'VND', 'pending', ${JSON.stringify({ plan: 'user' })})
  `;

  const response = await fetch(MOMO_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await response.json() as any;

  if (data.resultCode !== 0) {
    await sql`UPDATE public.payment_orders SET status = 'failed' WHERE id = ${orderId}`;
    return res.status(400).json({ error: data.message });
  }

  res.json({ payUrl: data.payUrl });
});

// POST /api/payments/momo/ipn  (server-to-server — authoritative)
router.post('/ipn', async (req, res) => {
  const { partnerCode, orderId, requestId, amount, orderInfo, orderType,
          transId, resultCode, message, payType, responseTime, extraData, signature } = req.body;

  // Verify signature
  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join('&');

  const expectedSig = crypto
    .createHmac('sha256', MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  if (resultCode !== 0) {
    await sql`UPDATE public.payment_orders SET status = 'failed' WHERE id = ${orderId}`;
    return res.json({ message: 'Acknowledged' });
  }

  // Idempotency check
  const [order] = await sql`SELECT * FROM public.payment_orders WHERE id = ${orderId}`;
  if (!order || order.status === 'completed') return res.json({ message: 'OK' });

  await sql.begin(async sql => {
    await sql`UPDATE public.payment_orders SET status = 'completed', gateway_txn_id = ${String(transId)} WHERE id = ${orderId}`;
    await sql`UPDATE public.profiles SET role = 'user', updated_at = NOW() WHERE user_id = ${order.user_id}`;
  });

  return res.json({ message: 'OK' });
});
```

### Environment Variables Required
```
MOMO_PARTNER_CODE=MOMOIQA420180417   # from MoMo merchant registration
MOMO_ACCESS_KEY=F8BBA842ECF85        # from MoMo merchant registration
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz  # from MoMo merchant registration
```

**Note on sandbox credentials:** The example credentials above appear in MoMo's public documentation examples. For real sandbox testing you must register at developers.momo.vn to get your own credentials. MoMo requires a business registration — individual developer accounts also work in sandbox.

**MoMo minimum timeout:** Set 30-second timeout on the API call. MoMo documentation specifies this.

**Confidence:** HIGH for API structure — verified via official MoMo developer documentation. MEDIUM for exact IPN signature field order — verify against developers.momo.vn at implementation time, as field order changed between v1 and v3.

---

## 5. PayOS (Unified Gateway — NOT Recommended for This Phase)

**PayOS does NOT support Visa/Mastercard or MoMo.** It is an A2A (Account-to-Account) bank transfer gateway that generates VietQR codes only. The `@payos/node` v2.0.5 package is well-maintained and easy to integrate, but it cannot substitute for card payments.

**When PayOS would be appropriate:**
- Adding "pay by bank transfer" as an additional option (Phase 11+)
- Users without cards or MoMo wallets

**PayOS strengths:**
- 99% cost reduction vs card processing fees
- No merchant agreement paperwork (API key immediately from my.payos.vn)
- Clean Node.js SDK with webhook verification built-in

**If added later — PayOS integration is 2 hours of work:**
```typescript
import { PayOS } from '@payos/node';
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});
const link = await payOS.paymentRequests.create({
  orderCode: Date.now(),
  amount: 99000,
  description: 'Nang cap tai khoan',
  returnUrl: `${APP_URL}/payment/result`,
  cancelUrl: `${APP_URL}/payment/cancel`,
});
```

**Confidence:** HIGH — verified via PayOS official docs at payos.vn and npm package @payos/node v2.0.5.

---

## 6. Database Schema

### New Tables Required

```sql
-- Migration: 013_add_payment_tables.sql

-- Orders: one record per payment attempt
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id            text PRIMARY KEY,                    -- e.g. "ORD_1712345678_abcd1234"
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway       text NOT NULL,                       -- 'vnpay' | 'momo' | 'payos'
  amount        integer NOT NULL,                    -- in VND, no decimals
  currency      text NOT NULL DEFAULT 'VND',
  status        text NOT NULL DEFAULT 'pending',     -- 'pending' | 'completed' | 'failed' | 'expired'
  gateway_txn_id text,                              -- VNPay vnp_TransactionNo, MoMo transId
  plan_granted  text,                               -- 'user' (what role upgrade to grant)
  metadata      jsonb,                              -- arbitrary order context
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz
);

-- Webhook log: audit trail for all inbound IPN/webhook calls
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway       text NOT NULL,
  event_type    text,
  order_id      text,
  raw_payload   jsonb NOT NULL,
  processed     boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
  ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status
  ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at
  ON public.payment_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id
  ON public.payment_webhook_events(order_id);
```

### Why No Separate `subscriptions` Table

For Phase 10, upgrading `free` → `user` is a **one-time lifetime upgrade** (no expiry, no recurring billing). A `payment_orders` table is sufficient. A separate `subscriptions` table would be needed if/when recurring billing (monthly/annual auto-renewal) is added. Keep it simple for now.

### Profile Role Update

The existing `public.profiles` table already has the `role` column. No schema change needed there. The payment IPN handler updates it directly.

---

## 7. Webhook Architecture

### Core Principle: IPN is Authoritative, Return URL is Display Only

```
Browser redirect (/payment/result) → ONLY show status UI
Server IPN (/api/payments/vnpay/ipn or /api/payments/momo/ipn) → UPDATE DB + upgrade role
```

Never trust the return URL for business operations. Users can manipulate return URL query params.

### Idempotency Pattern (PostgreSQL)

The IPN may be called multiple times (VNPay retries on timeout). Pattern:
1. Check `payment_orders.status` before processing
2. If `status === 'completed'`, return success response without re-processing
3. Use `sql.begin()` transaction to atomically update order + profile

```typescript
// IPN handler idempotency guard
const [order] = await sql`SELECT status, user_id, amount FROM public.payment_orders WHERE id = ${orderId}`;
if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });
if (order.status === 'completed') {
  // MUST still return success — VNPay expects 00 even on repeat calls
  return res.json({ RspCode: '00', Message: 'Already processed' });
}
```

### Webhook Logging

Log every inbound IPN to `payment_webhook_events` table before processing. This enables audit trails and replay debugging without re-hitting the gateway.

```typescript
// Log first, then process
await sql`
  INSERT INTO public.payment_webhook_events (gateway, order_id, raw_payload)
  VALUES ('vnpay', ${orderId}, ${JSON.stringify(req.query)})
`;
```

### IPN URL Requirements

IPN URL must be **publicly accessible** — no localhost. For development:
- Use `ngrok http 3000` and update IPN URL in VNPay/MoMo dashboard
- Railway production URL works directly

### Profile Cache Invalidation

`server/auth.ts` has a `profileCache` Map with 30-second TTL. After upgrading `profiles.role`, call `profileCache.delete(userId)` to ensure the user's next request sees the new role without waiting 30 seconds.

Since `profileCache` is module-level state in `server/auth.ts`, export it or export an `invalidateProfileCache(userId)` function.

---

## 8. Frontend Flow

### Recommended: Redirect Flow (Not Embedded / Not Popup)

For both VNPay and MoMo, the payment page is **hosted by the gateway**. The user is redirected to the gateway's page, completes payment, then redirected back.

This is the right choice for this stack because:
- No card data ever touches the app server — PCI compliance simplified to SAQ A level
- Works on all devices without iframe/popup restrictions
- Matches how 100% of Vietnamese gateway implementations work in practice

### React SPA Redirect Pattern

```tsx
// components/CheckoutModal.tsx
const [loading, setLoading] = useState(false);

const handlePay = async (gateway: 'vnpay' | 'momo') => {
  setLoading(true);
  try {
    const res = await fetch(`/api/payments/${gateway}/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.paymentUrl || data.payUrl) {
      // Full page redirect — works for both VNPay and MoMo
      window.location.href = data.paymentUrl ?? data.payUrl;
    }
  } catch (err) {
    setLoading(false);
    showError('Không thể tạo liên kết thanh toán');
  }
};
```

### Return URL Handler Page

The `/payment/result` route in React reads query params from VNPay/MoMo redirect and shows a status screen. Do NOT make additional API calls here to "confirm" payment — the IPN already updated the DB. Just show the result to the user.

```tsx
// pages/PaymentResult.tsx
const params = new URLSearchParams(window.location.search);
const status = params.get('status') ?? params.get('vnp_ResponseCode') ?? params.get('resultCode');
// Show success/fail UI, then redirect to dashboard after 3s
```

### Phase 6 Mock UI Replacement

Phase 6 has a mock checkout with card number/expiry/CVV fields. This UI should be **replaced**, not extended. Real card data must never reach the app — replace the mock form with gateway selection buttons (VNPay card, MoMo wallet).

---

## 9. Security Considerations

### HMAC Verification is Mandatory

Both VNPay and MoMo use HMAC signatures. Never process an IPN without verifying the signature first. The signature prevents forged webhook calls from fraudulently upgrading accounts.

### PCI DSS Scope

By using hosted/redirect payment pages, the app never touches cardholder data (PAN, CVV, expiry). This limits PCI scope to **SAQ A** (self-assessment questionnaire A) — the simplest tier. This is why the redirect flow is strongly preferred over embedded card forms.

### Replay Attack Prevention

VNPay and MoMo include transaction IDs. The idempotency check (`status === 'completed'` guard) prevents replay: even if the same IPN is delivered twice, the second call is a no-op.

### Secret Key Protection

```
NEVER commit VNPAY_SECURE_SECRET or MOMO_SECRET_KEY to git.
Use environment variables only.
The existing .env.example pattern is correct — add the new keys there with placeholder values.
```

### IP Whitelist Consideration (LOW priority)

MoMo and VNPay publish lists of IP addresses from which IPN calls originate. Adding IP whitelist filtering to IPN endpoints is an additional defense layer. Not strictly required for launch but recommended for production hardening.

### Amount Verification

Always verify the `amount` in the IPN matches the amount stored in `payment_orders`. Do not trust the gateway's reported amount as the source of truth for what was charged.

---

## 10. Key Implementation Risks

### Risk 1: IPN URL Not Publicly Accessible During Development
**What goes wrong:** Developer runs locally, registers localhost IPN URL in gateway dashboard, IPN never arrives, order never upgrades.
**Mitigation:** Use ngrok (`ngrok http 3000`) during local development. Document this in dev setup. For CI, mock the IPN handler.

### Risk 2: Duplicate Role Upgrade
**What goes wrong:** VNPay retries IPN 3 times if it doesn't get `00` response. If handler throws, second call would re-process.
**Mitigation:** The idempotency guard pattern described in Section 7. Return `00` even for already-processed orders.

### Risk 3: Profile Cache Stale After Upgrade
**What goes wrong:** IPN upgrades `profiles.role` to 'user', but the in-memory `profileCache` still has `role: 'free'` for up to 30 seconds. User tries to use paid features immediately and gets 403.
**Mitigation:** Export `profileCache.delete(userId)` or an `invalidateProfileCache` function from `server/auth.ts`. Call it in the IPN handler after successful upgrade.

### Risk 4: MoMo Registration Complexity
**What goes wrong:** MoMo merchant registration requires business documents and takes days. Sandbox is available for testing but the process is manual.
**Mitigation:** Start MoMo merchant registration during Phase 10 planning, not during implementation. VNPay sandbox self-service at sandbox.vnpayment.vn is immediate.

### Risk 5: VNPay `vnp_Amount` is Multiplied by 100
**What goes wrong:** VNPay's `vnp_Amount` parameter requires the amount multiplied by 100 (so 99,000 VND = `9900000`). Getting this wrong causes payment amount mismatch.
**Mitigation:** The `vnpay` npm library v2.4.4 handles this automatically — pass raw VND amount, library multiplies. Verify with a sandbox test.

### Risk 6: MoMo Signature Field Order is Version-Sensitive
**What goes wrong:** MoMo v1 and v3 APIs have different signature field orders. Using wrong order causes `Invalid signature` errors.
**Mitigation:** Always reference developers.momo.vn/v3 documentation. Do not copy old blog posts — they may reference v1 format.

### Risk 7: APP_URL Must Be HTTPS in Production
**What goes wrong:** Both VNPay and MoMo require HTTPS for returnUrl and ipnUrl. HTTP URLs are rejected.
**Mitigation:** Railway provides HTTPS automatically. Set `APP_URL=https://your-app.railway.app` in production env vars.

---

## 11. Recommended Phase Structure

Break Phase 10 into 4 implementation waves:

### Wave 0: Database Migration + Profile Cache Export
- Add `013_add_payment_tables.sql` migration
- Export `profileCache` or add `invalidateProfileCache(userId)` from `server/auth.ts`
- Add env vars to `.env.example`: `VNPAY_TMN_CODE`, `VNPAY_SECURE_SECRET`, `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `APP_URL`

### Wave 1: VNPay Integration
- Install `vnpay` npm package
- Implement `server/routes/payments/vnpay.ts` (create, return, IPN)
- Register in `server/index.ts` as `/api/payments/vnpay`
- Sandbox test with NCB test card

### Wave 2: MoMo Integration
- Implement `server/routes/payments/momo.ts` (create, IPN) — no npm package needed
- Register in `server/index.ts` as `/api/payments/momo`
- Sandbox test with MoMo test app

### Wave 3: Frontend Checkout Flow
- Replace Phase 6 mock checkout UI with real gateway selection buttons
- Implement `/payment/result` page in React
- Invalidate auth token / refresh user role after successful payment (token still says 'free', need re-login or token refresh)

### Wave 4: Token Refresh After Upgrade
**This is a non-obvious requirement.** After upgrading the DB role, the user's JWT still says `role: 'free'`. The frontend must:
- Either force re-login after successful payment
- Or call `/api/auth/refresh` to get a new token with updated role
- Or `requireAuth` reads from DB (which it does via `profileCache`) — but the 30s cache + the client-side token payload may still show free features until token expiry

**Recommended:** Add an endpoint `POST /api/payments/check-upgrade` that the success page calls. It clears profile cache and issues a new JWT. Or simply instruct user to re-login.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| HMAC signature for VNPay | Custom crypto code | `vnpay` npm library handles it |
| Payment URL parameter encoding | Manual URL building | `vnpay.buildPaymentUrl()` |
| VNPay return URL verification | Manual query param parsing | `vnpay.verifyReturnUrl()` |
| VNPay IPN verification | Manual HMAC check | `vnpay.verifyIpnCall()` |
| MoMo signature | (No npm package) | Node.js `crypto.createHmac('sha256', secretKey)` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | `vnpay` library minimum | Yes | v22.22.1 | — |
| `vnpay` npm package | VNPay integration | Not installed yet | 2.4.4 (install needed) | — |
| `@payos/node` | PayOS (deferred) | Not installed | 2.0.5 | N/A - deferred |
| VNPay sandbox | Testing | Self-service at sandbox.vnpayment.vn | — | — |
| MoMo sandbox | Testing | Requires registration at developers.momo.vn | — | Postman mock |
| Public IPN URL | VNPay/MoMo IPN delivery | Railway = automatic; local = ngrok | — | ngrok |

**Missing with install step:**
- `vnpay` package: `npm install vnpay` (Wave 1 task)

**Missing requiring external action:**
- VNPay sandbox credentials: register at sandbox.vnpayment.vn (free, immediate)
- MoMo sandbox credentials: register at developers.momo.vn (requires business info, may take 1-3 days)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.0.18 |
| Config file | vitest.config.ts (exists) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements Test Map

| Behavior | Test Type | Notes |
|----------|-----------|-------|
| VNPay payment URL generation | Unit | Mock `vnpay` library, verify URL returned |
| VNPay IPN signature verification | Unit | Test with valid and tampered signatures |
| MoMo HMAC signature generation | Unit | Pure crypto function — fully testable |
| MoMo IPN handler idempotency | Unit | Send same orderId twice, verify single upgrade |
| Role upgrade on successful payment | Integration | Requires DB; verify `profiles.role` changes |
| Profile cache invalidation | Unit | Mock `profileCache`, verify delete called |
| Duplicate IPN not double-upgrading | Integration | Send IPN twice, verify role only set once |

### Wave 0 Test Gaps
- [ ] `server/routes/__tests__/payments.test.ts` — unit tests for payment handlers
- [ ] `server/routes/__tests__/payments.integration.test.ts` — integration tests requiring DB

---

## Sources

### Primary (HIGH confidence)
- [vnpay.js.org](https://vnpay.js.org/en/) — Official VNPay Node.js library docs, configuration, IPN pattern
- [vnpay Express example](https://github.com/lehuygiang28/vnpay/blob/main/example/express.ts) — Verified code patterns
- [VNPay npm package](https://www.npmjs.com/package/vnpay) — Version 2.4.4 confirmed
- [MoMo One-Time Payments API](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/) — API endpoint, request params, HMAC formula
- [PayOS Node.js SDK](https://payos.vn/docs/sdks/back-end/node/) — Confirmed PayOS is VietQR only
- [@payos/node npm](https://www.npmjs.com/package/@payos/node) — Version 2.0.5 confirmed
- db/schema.sql, server/auth.ts — Project's existing DB schema and auth system

### Secondary (MEDIUM confidence)
- [VNPay sandbox test card](https://sandbox.vnpayment.vn/) — NCB test card credentials
- [MoMo sandbox endpoint](https://test-payment.momo.vn/) — Sandbox endpoint URL confirmed via multiple sources
- [MoMo Digital Signature](https://developers.momo.vn/v3/docs/payment/api/other/signature/) — HMAC field order for create request

### Tertiary (LOW confidence — verify at implementation)
- MoMo IPN (callback) signature field order — field list obtained from community sources; always verify against developers.momo.vn/v3 at implementation time
- MoMo sandbox partnerCode/accessKey examples — illustrative only; register for real credentials

---

## Metadata

**Confidence breakdown:**
- VNPay integration: HIGH — official npm library with full docs
- MoMo create flow: HIGH — official API docs with complete parameter list
- MoMo IPN field order: MEDIUM — verify at implementation
- PayOS clarification: HIGH — verified from official docs
- Stripe Vietnam: HIGH — confirmed unavailable for Vietnam-registered businesses
- DB schema: HIGH — designed to match existing project patterns
- Frontend redirect flow: HIGH — standard for Vietnamese gateways

**Research date:** 2026-04-02
**Valid until:** 2026-07-02 (90 days — Vietnamese gateway APIs are stable, credentials/sandbox may change faster)

---

## Key Decision Summary (for Planner)

1. **Use VNPay** (`vnpay` npm) for Visa/Mastercard + domestic card + VNPay QR. One gateway, one package, one registration.
2. **Use MoMo** (raw Node.js crypto) for MoMo e-wallet. No npm package needed.
3. **Do NOT use Stripe** — unavailable for Vietnam businesses without foreign company.
4. **Do NOT use PayOS for cards** — PayOS is bank transfer / VietQR only.
5. **Install `vnpay`** before Wave 1: `npm install vnpay`
6. **Start MoMo merchant registration early** — sandbox credentials require registration.
7. **IPN only for business logic** — return URL is UI only.
8. **Invalidate profileCache** after role upgrade — currently a 30s in-memory cache in `server/auth.ts`.
9. **Wave 4: Token refresh** — JWT still shows old role after DB update; frontend must handle this.
