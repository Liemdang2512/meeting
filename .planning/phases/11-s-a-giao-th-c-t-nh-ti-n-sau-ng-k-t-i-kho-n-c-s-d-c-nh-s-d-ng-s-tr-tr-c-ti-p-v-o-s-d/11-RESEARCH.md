# Phase 11: sua giao thuc tinh tien - Research

**Researched:** 2026-04-07  
**Domain:** Prepaid internal credits billing model for AI workflow usage  
**Confidence:** MEDIUM-HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions
### Credit Model va Goi nap
- **D-01:** Dung `internal_credits` thay vi vi VND truc tiep.
- **D-02:** Giu cac muc goi hien co trong app lam goi nap credit: `299.000`, `399.000`, `499.000`.
- **D-03:** Moi goi vua nap credit, vua mo workflow tuong ung nhu hien tai (`reporter`/`specialist`/`officer`), khong tach rieng thanh hai giao dich khac nhau.

### Quy tac tru tien
- **D-04:** Tru tien tai thoi diem bat dau event "tao bien ban/tom tat AI", khong tru tu buoc transcription.
- **D-05:** Neu flow xu ly that bai sau khi da tru o buoc bat dau, hoan full tu dong.

### Chinh sach so du khong du
- **D-06:** Cho phep no am co nguong.
- **D-07:** Nguong am mac dinh: `-10.000 credits` (khong duoc am qua muc nay).

### Migration user cu
- **D-08:** User cu tung mua theo mo hinh truoc duoc giu quyen cho toi khi het hieu luc theo migration batch.
- **D-09:** Dung co che admin migration batch de gan thoi diem het hieu luc cho tung user (khong dung moc toan cuc cung).

### Claude's Discretion
- Chi tiet schema DB cho ledger/transactions va cach dat ten bang/cot.
- Cong thuc pricing cu the theo tung action AI (rate card chi tiet).
- Co che idempotency/locking khi tru tien song song.
- Thiet ke UI hien thi so du, no am, lich su tru/hoan.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Project Constraints (from .cursor/rules/)

- No `.cursor/rules/` markdown files were found in this workspace.
- Workspace-wide mandatory constraints still apply from `AGENTS.md`: read files before editing, avoid unnecessary new dependencies, keep TypeScript strict patterns, run tests before commit.

## Summary

Phase 11 is not just a payment integration change; it is a pricing contract change from "subscription unlock + effectively unlimited usage" to "prepaid internal credits with direct deduction per AI generation event." Business correctness must come first: define credit economics, charge/refund events, overdraft policy, and migration sunset for legacy paid users, then encode those rules as invariant server-side transactions.

Evidence from current codebase shows payment gateways already have a strong pattern: create pending order, process webhook authoritatively, update profile atomically in a DB transaction, and invalidate auth cache. This is a strong base to extend into a credit-ledger architecture. However, current AI generation is still callable directly from frontend (`services/geminiService.ts`), which means billing enforcement is bypassable unless generation gets server-authorized and deduction happens in backend transaction boundaries.

**Primary recommendation:** lock business policy as immutable ledger events first, then implement a server-authorized "charge at start, refund on failure" flow with idempotent transaction keys and profile/cache refresh.

## Business Model Decisions and Implications

### 1) Credit pack economics (D-01, D-02, D-03)
- Keep 3 familiar price anchors (`299k`, `399k`, `499k`) as pack SKUs to reduce pricing UX churn.
- Each successful purchase must perform 2 domain effects atomically:
  - credit top-up (`internal_credits` increase),
  - workflow entitlement unlock (existing `workflow_groups` append behavior).
- Implication: payment webhooks must evolve from "set role/features" to "append entitlement + insert credit ledger funding event."

### 2) Billing events (D-04, D-05)
- Billable trigger is "start AI minutes/summary generation," not transcription upload/save.
- Deduction timing is pre-execution reservation/charge at start (not post-hoc metering).
- If downstream generation fails after charge, system must issue full compensation automatically.
- Implication: charge/refund must share a correlation key (`billing_event_id`) so retried requests or partial failures do not double-charge or double-refund.

### 3) Negative balance policy (D-06, D-07)
- Overdraft allowed to `-10,000 credits` max.
- Decision boundary: request is accepted iff `current_balance - charge_amount >= -10000`.
- Implication: concurrent requests must serialize on account row (or equivalent lock) to preserve overdraft invariant.

### 4) Refund and failure policy
- Refund is not user-initiated finance refund from gateway; this is internal compensation event in credit ledger.
- Should be modeled as separate immutable credit entry, never mutating/deleting original debit.
- Implication: auditability and dispute debugging become straightforward.

### 5) Migration policy for old users (D-08, D-09)
- Legacy paid users keep old rights until per-user/per-batch sunset timestamp.
- No hard global cutover date.
- Implication:
  - need migration batch table/state,
  - runtime authorization checks must branch on "legacy entitlement still valid" before enforcing credit deduction.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `postgres` | installed `3.4.8` (latest `3.4.9`, published 2026-04-05) | SQL client + transactions | Already used everywhere for atomic payment/profile updates |
| `express` | installed `4.21.2` (latest `5.2.1`, published 2025-12-01) | API routes/middleware | Existing server runtime and auth/payment middleware foundation |
| PostgreSQL server | local client `18.3` detected | source of truth for balances/ledger | Row locking + transactional guarantees for billing invariants |
| `zod` | installed `4.3.6` (latest `4.3.6`) | request/response schema validation | Existing validation style in auth/gemini code |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | installed `4.0.18` (latest `4.1.2`, published 2026-03-26) | unit/integration testing | Payment/ledger race + compensation tests |
| Existing payment gateways (`vnpay`, MoMo API, VietQR) | currently integrated | top-up funding channel | Keep as-is; only post-payment domain effects change |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Internal credit ledger in current DB | External billing wallet provider | Faster start with current stack; external wallet adds integration latency/cost |
| Keep `express@4` in phase | Upgrade to `express@5` now | Upgrading framework in same phase adds regression risk unrelated to billing model |
| Direct frontend Gemini calls | Full server-side AI proxy only | Server proxy is safer for enforcement but bigger refactor; can stage rollout |

**Installation:**
```bash
# No new dependency required for phase core
# Optional: keep current stack pinned in package.json for this phase
```

**Version verification commands used:**
```bash
npm view express version
npm view postgres version
npm view zod version
npm view vitest version
```

## Technical Architecture and Options (to implement locked business decisions)

### Recommended Project Structure
```text
server/
├── routes/
│   ├── billing/                 # new: charge/refund/ledger read APIs
│   ├── payments/                # extend webhook effects to credit funding
│   └── summaries.ts             # integrate charge-at-start orchestration
├── services/
│   └── billingService.ts        # domain logic: authorizeCharge/refundOnFailure
└── db/
    └── migrations/              # new tables: wallet_ledger, migration_batches
```

### Pattern 1: Immutable ledger + derived balance snapshot
**What:** Persist all wallet mutations as append-only events (`topup`, `debit`, `refund`, `migration_grant`, `migration_expire`) and compute balance from ledger (optionally with cached snapshot updated transactionally).  
**When to use:** Always for prepaid/overdraft systems needing audit + compensation.  
**Example (conceptual SQL):**
```sql
BEGIN;
SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE;
-- validate overdraft threshold
UPDATE wallet_balances
SET balance = balance - $2, updated_at = NOW()
WHERE user_id = $1
RETURNING balance;
INSERT INTO wallet_ledger(user_id, event_type, amount, correlation_id, metadata)
VALUES ($1, 'debit', -$2, $3, $4::jsonb);
COMMIT;
```
Source: [PostgreSQL explicit locking docs](https://www.postgresql.org/docs/current/explicit-locking.html), [PostgreSQL transaction isolation docs](https://www.postgresql.org/docs/current/transaction-iso.html)

### Pattern 2: Payment webhook remains authoritative funding trigger
**What:** Keep current gateway flow (`payment_orders` + webhook logs + idempotent status update), but replace role-upgrade side effects with credit-funding ledger events.  
**When to use:** For all top-up purchases from VNPay/MoMo/VietQR.  
**Example (current code pattern to preserve):**
```typescript
await sql.begin(async (tx: any) => {
  await tx`UPDATE public.payment_orders SET status = 'completed' ...`;
  await tx`UPDATE public.profiles SET ... WHERE user_id = ${order.user_id}`;
});
invalidateProfileCache(order.user_id);
```
Source: `server/routes/payments/vnpay.ts`, `server/routes/payments/momo.ts`, `server/routes/payments/vietqr.ts`

### Pattern 3: Charge-at-start + compensating refund
**What:** At AI generation start, reserve/debit credits in a DB transaction. On downstream failure, append full refund event using same `correlation_id`.  
**When to use:** `minutes-generate` and future billable AI actions only (not transcription).  
**Key requirement:** enforce server-side orchestration; frontend-only Gemini calls cannot be trusted for billing.

### Anti-Patterns to Avoid
- **Frontend-enforced billing:** current direct `GoogleGenAI` calls in client can bypass billing.
- **Mutable balance without ledger entry:** loses audit trail and makes compensation reconciliation hard.
- **Check-then-update without lock:** race conditions violate overdraft cap.
- **Global migration cutoff date:** contradicts D-09 batch-per-user sunset decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent balance control | ad-hoc JS mutex in API process | PostgreSQL row lock (`FOR UPDATE`) + transaction | Works across multi-instance deployments |
| Idempotency | in-memory processed-event cache | DB unique constraints on `correlation_id` / webhook ids | Durable and restart-safe |
| Refund rollback | delete/edit debit row | append compensating refund ledger event | Immutable audit trail |
| Payment gateway trust | trust return URL success param | webhook/IPN authoritative state transition | Current architecture already follows this and is correct |

**Key insight:** billing correctness must be encoded as database invariants, not UI conventions.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `public.profiles` currently stores role/workflow/features; no wallet state yet. `public.payment_orders` + `public.payment_webhook_events` store payment history. Legacy users need sunset metadata per batch (D-08/D-09). | **Code edit + data migration**: add wallet tables + migration batch tables; backfill initial balances/legacy sunset states. |
| Live service config | Payment gateway merchant configs (`VNPAY_*`, `MOMO_*`, `VIETQR_*`) are runtime secrets, but naming does not encode old billing model. | **None** for rename; **code edit** only to change post-payment business effects. |
| OS-registered state | No evidence of billing-model-specific OS schedulers/services in repo context. | None — verified by codebase-only scope. |
| Secrets/env vars | Existing gateway + app URL env vars are present in payment routes. New model may require optional billing envs (e.g., default overdraft limit) but no mandatory rename of existing secrets. | **Code edit** for new optional vars; no secret key renaming required. |
| Build artifacts | No billing-model-coupled generated artifacts found in repo. | None — verified by repository inspection. |

## Common Pitfalls

### Pitfall 1: Bypassable billing due to client-side AI call path
**What goes wrong:** user can call Gemini directly from frontend without server deduction.  
**Why it happens:** `services/geminiService.ts` performs direct provider calls with local API key.  
**How to avoid:** move billable generation path behind server endpoint that charges first and proxies generation.  
**Warning signs:** credits unchanged while summary count grows.

### Pitfall 2: Double-charge on retry/reconnect
**What goes wrong:** same generation request billed multiple times.  
**Why it happens:** missing idempotency key at charge boundary.  
**How to avoid:** require `billing_event_id` unique per logical generation request.  
**Warning signs:** multiple debit rows with same request metadata.

### Pitfall 3: Overdraft threshold violated under concurrency
**What goes wrong:** parallel requests both pass pre-check and push balance below `-10000`.  
**Why it happens:** read-then-write without row lock/serializable strategy.  
**How to avoid:** `FOR UPDATE` locking and single transaction invariant check.  
**Warning signs:** balance less than configured minimum with no admin override.

### Pitfall 4: Legacy user disruption on migration day
**What goes wrong:** old paid users suddenly blocked before intended sunset.  
**Why it happens:** using global feature flag date, not per-batch/per-user expiry (D-09).  
**How to avoid:** explicit migration batch assignment and effective-until checks in auth/billing gate.  
**Warning signs:** support tickets from legacy paid users despite valid migration window.

## Code Examples

Verified patterns from current codebase and official docs:

### Atomic payment effect (existing internal pattern)
```typescript
await sql.begin(async (tx: any) => {
  await tx`
    UPDATE public.payment_orders
    SET status = 'completed', gateway_txn_id = ${txnId}, updated_at = NOW()
    WHERE id = ${orderId}
  `;
  await tx`
    UPDATE public.profiles
    SET role = 'user', features = ${sql.array(ALL_FEATURES)}, updated_at = NOW()
    WHERE user_id = ${userId}
  `;
});
```
Source: `server/routes/payments/momo.ts`, `server/routes/payments/vnpay.ts`

### Quota atomic increment-then-check (existing race-safe style)
```typescript
const [quota] = await sql`
  INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
  VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = daily_conversion_usage.count + 1
  RETURNING count
`;
```
Source: `server/routes/transcriptions.ts`

### Postgres row locking for safe concurrent debits
```sql
SELECT balance FROM wallet_balances WHERE user_id = $1 FOR UPDATE;
```
Source: [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Role-only upgrade (`free` -> access via role/features) | Credit-ledger + event-based deduction | This phase | Better monetization granularity and fairness per usage |
| UI-driven quota/upgrade prompts | Server-authoritative billing gate per billable event | This phase target | Prevents bypass and inconsistent charging |
| Mutable "subscription state only" | Immutable ledger events + derived balance | Industry current best practice | Enables audit, refund correctness, reconciliation |

**Deprecated/outdated for this phase:**
- Treating successful gateway redirect alone as entitlement source (keep webhook as source of truth).
- Treating role change as sufficient billing state.

## Open Questions

1. **Credit conversion rates per action**
   - What we know: price packs are fixed (`299k/399k/499k`), action-level rates are discretionary.
   - What's unclear: exact debit per action (`minutes-generate`, future mindmap/checklist/email AI).
   - Recommendation: define explicit rate card table before implementation tasks.

2. **Server proxy scope for Gemini**
   - What we know: current app has both server `/api/gemini/generate` and direct frontend AI calls.
   - What's unclear: full migration strategy timeline to prevent bypass.
   - Recommendation: phase task 1 should lock billable path to server first; optional later migration for all AI calls.

3. **Legacy entitlement representation**
   - What we know: D-09 requires admin migration batches.
   - What's unclear: whether sunset is stored in profile columns vs dedicated migration table.
   - Recommendation: dedicated migration table for auditability and rollback.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | server routes/tests | ✓ | `v22.22.1` | — |
| npm | dependency/test scripts | ✓ | `10.9.4` | — |
| Python | optional tooling/skills | ✓ | `3.12.12` | — |
| Docker Engine | integration DB workflow | ✓ | `29.1.3` | local native postgres |
| Docker Compose | test DB orchestration | ✓ | `v5.0.1` | manual DB startup |
| PostgreSQL client tools (`psql`, `pg_isready`) | DB diagnostics | ✓ | `psql 18.3` | — |
| Local PostgreSQL server | running integration tests immediately | ✗ (no response on `/tmp:5432`) | — | use dockerized test DB (`npm run db:up`) |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- Local running Postgres instance absent right now; fallback is existing Docker test stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`4.0.18` installed) |
| Config file | `vitest.config.ts`, `vitest.integration.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-04/D-05 | charge at start + full compensation on failure | integration | `npm run test:integration -- server/routes/__tests__/billing.integration.test.ts` | ❌ Wave 0 |
| D-06/D-07 | overdraft guard at `-10000` under concurrency | integration | `npm run test:integration -- server/routes/__tests__/billing.overdraft.integration.test.ts` | ❌ Wave 0 |
| D-08/D-09 | legacy batch sunset entitlement behavior | integration | `npm run test:integration -- server/routes/__tests__/billing.migration.integration.test.ts` | ❌ Wave 0 |
| Payment top-up mapping | webhook -> credit funding idempotency | integration | `npm run test:integration -- server/routes/__tests__/payments.integration.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:integration`
- **Phase gate:** `npm run test:all` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/routes/__tests__/billing.integration.test.ts` - debit/refund/correlation id scenarios
- [ ] `server/routes/__tests__/billing.overdraft.integration.test.ts` - parallel debits around floor limit
- [ ] `server/routes/__tests__/billing.migration.integration.test.ts` - legacy grace-period authorization
- [ ] `server/routes/__tests__/billing.unit.test.ts` - rate-card + idempotency key pure logic

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) - row/table lock semantics (`FOR UPDATE`) and deadlock guidance
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) - concurrency anomalies and retry semantics
- [Stripe Billing Credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) - credit grants states, immutable ledger model, invoice application timing
- [Stripe Customer Credit Balance](https://stripe.com/docs/invoicing/customer/balance) - immutable transaction ledger and reversal-by-counter-entry principle
- [Stripe Refund and cancel payments](https://docs.stripe.com/refunds) - refund lifecycle, failed refund event handling
- Local code references:
  - `server/routes/payments/vnpay.ts`
  - `server/routes/payments/momo.ts`
  - `server/routes/payments/vietqr.ts`
  - `server/routes/transcriptions.ts`
  - `server/auth.ts`
  - `services/geminiService.ts`

### Secondary (MEDIUM confidence)
- [Chargebee usage billing FAQs](https://www.chargebee.com/docs/billing/2.0/usage-based-billing/usage-based-billing-faqs) - overage/hybrid model and grandfathering behavior
- [Modern Treasury wallet balance types](https://www.moderntreasury.com/journal/fintech-eng-challenges-part-i-different-balance-types-in-a-wallet) - balance type modeling and ledger drift pitfalls

### Tertiary (LOW confidence)
- General SaaS billing blog aggregations from web search (used only for hypothesis framing, not final prescriptions).

## Metadata

**Confidence breakdown:**
- Business model implications: **HIGH** - directly constrained by `11-CONTEXT.md` + verified industry docs.
- Architecture implementation: **MEDIUM-HIGH** - strong internal code evidence, but final approach depends on how much AI flow is moved server-side in this phase.
- Pitfalls: **MEDIUM** - validated by current code patterns and known billing concurrency failures.

**Research date:** 2026-04-07  
**Valid until:** 2026-05-07
