import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { BillingInsufficientBalanceError, authorizeAndCharge } from '../billing/billingService';
import { BILLING_ACTION_TYPES, type BillingActionType } from '../billing/types';
import { getCreditsPerMillionOutputTokens, getOutputTokenChargeCredits } from '../billing/rateCard';

const router = Router();
router.use(requireAuth);

function parseTokenLogQuery(query: Record<string, string | undefined>) {
  const splitCsv = (input?: string): string[] =>
    (input ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const {
    from,
    to,
    feature,
    userId,
    emails,
    userIds,
    features,
    actionTypes,
  } = query;

  const featuresCsv = splitCsv(features);
  const userIdsCsv = splitCsv(userIds);
  const emailsCsv = splitCsv(emails).map((e) => e.toLowerCase());
  const actionTypesCsv = splitCsv(actionTypes);

  const effectiveFeatures =
    featuresCsv.length > 0 ? featuresCsv : feature && feature !== 'all' ? [feature] : [];
  const effectiveUserIds = userIdsCsv.length > 0 ? userIdsCsv : userId ? [userId] : [];

  const featureFilter =
    effectiveFeatures.length > 0 ? sql`AND l.feature = ANY(${sql.array(effectiveFeatures)})` : sql``;
  const userFilter =
    effectiveUserIds.length > 0
      ? sql`AND l.user_id = ANY(${sql.array(effectiveUserIds)}::uuid[])`
      : sql``;
  const emailFilter =
    emailsCsv.length > 0
      ? sql`AND LOWER(u.email) = ANY(${sql.array(emailsCsv)})`
      : sql``;
  const actionTypeFilter =
    actionTypesCsv.length > 0
      ? sql`AND l.action_type = ANY(${sql.array(actionTypesCsv)})`
      : sql``;
  const dateFilter = from && to
    ? sql`AND l.created_at >= ${from}::timestamptz AND l.created_at <= ${to}::timestamptz`
    : sql``;

  return { dateFilter, featureFilter, userFilter, emailFilter, actionTypeFilter };
}

type TokenLogSqlFilters = ReturnType<typeof parseTokenLogQuery>;

function tokenLogBaseJoin(f: TokenLogSqlFilters) {
  const { dateFilter, featureFilter, userFilter, emailFilter, actionTypeFilter } = f;
  return sql`
      FROM public.token_usage_logs l
      JOIN auth.users u ON u.id = l.user_id
      WHERE 1=1
        ${dateFilter}
        ${featureFilter}
        ${userFilter}
        ${emailFilter}
        ${actionTypeFilter}
    `;
}

/** Tổng hợp + facet trên toàn bộ dòng khớp bộ lọc (cùng WHERE với list). */
async function computeTokenLogAggregates(f: TokenLogSqlFilters) {
  const baseJoin = tokenLogBaseJoin(f);

  const [totalRow] = await sql`
      SELECT COALESCE(SUM(l.total_tokens), 0)::bigint AS total_tokens
      ${baseJoin}
    `;

  const byUserRows = await sql`
      SELECT l.user_id::text AS user_id, u.email, COALESCE(SUM(l.total_tokens), 0)::bigint AS total_tokens
      ${baseJoin}
      GROUP BY l.user_id, u.email
      ORDER BY total_tokens DESC
      LIMIT 5
    `;

  const byFeatureRows = await sql`
      SELECT COALESCE(l.feature, 'unknown') AS feature, COALESCE(SUM(l.total_tokens), 0)::bigint AS total_tokens
      ${baseJoin}
      GROUP BY COALESCE(l.feature, 'unknown')
      ORDER BY total_tokens DESC
    `;

  const emailFacetRows = await sql`
      SELECT DISTINCT u.email AS email
      ${baseJoin}
        AND u.email IS NOT NULL
        AND TRIM(u.email) <> ''
      ORDER BY u.email
      LIMIT 500
    `;

  const userIdFacetRows = await sql`
      SELECT DISTINCT l.user_id::text AS user_id
      ${baseJoin}
      ORDER BY 1
      LIMIT 500
    `;

  const featureFacetRows = await sql`
      SELECT DISTINCT l.feature AS feature
      ${baseJoin}
        AND l.feature IS NOT NULL
      ORDER BY l.feature
      LIMIT 200
    `;

  const actionFacetRows = await sql`
      SELECT DISTINCT l.action_type AS action_type
      ${baseJoin}
        AND l.action_type IS NOT NULL
      ORDER BY l.action_type
      LIMIT 200
    `;

  return {
    totalTokens: Number(totalRow?.total_tokens ?? 0),
    byUser: byUserRows.map((r) => ({
      userId: r.user_id as string,
      email: (r.email as string | null) ?? null,
      totalTokens: Number(r.total_tokens ?? 0),
    })),
    byFeature: byFeatureRows.map((r) => ({
      feature: (r.feature as string) ?? 'unknown',
      totalTokens: Number(r.total_tokens ?? 0),
    })),
    facets: {
      emails: emailFacetRows.map((r) => r.email as string).filter(Boolean),
      userIds: userIdFacetRows.map((r) => r.user_id as string),
      features: featureFacetRows.map((r) => r.feature as string).filter(Boolean),
      actionTypes: actionFacetRows.map((r) => r.action_type as string).filter(Boolean),
    },
  };
}

// POST /api/token-logs
// Body: { feature, action_type, model, input_tokens?, output_tokens?, total_tokens?, metadata? }
router.post('/', async (req, res) => {
  const { feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata } =
    req.body ?? {};
  if (!feature || !action_type || !model) {
    return res.status(400).json({ error: 'feature, action_type, model là bắt buộc' });
  }
  try {
    const [row] = await sql`
      INSERT INTO public.token_usage_logs
        (user_id, feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata)
      VALUES (
        ${req.user!.userId}, ${feature}, ${action_type}, ${model},
        ${input_tokens ?? null}, ${output_tokens ?? null}, ${total_tokens ?? null},
        ${metadata ? JSON.stringify(metadata) : null}
      )
      RETURNING id
    `;

    const tokenLogId = row?.id as string | undefined;
    const correlationId = tokenLogId ? `tokenlog:${tokenLogId}` : null;

    const isBillableAction = (BILLING_ACTION_TYPES as readonly string[]).includes(String(action_type));
    const billableTokensRaw =
      typeof output_tokens === 'number'
        ? output_tokens
        : typeof total_tokens === 'number'
          ? total_tokens
          : 0;
    const billableTokens = Math.max(0, Math.floor(Number(billableTokensRaw)));

    if (!tokenLogId || !correlationId || !isBillableAction || billableTokens === 0) {
      return res.status(201).json({
        ok: true,
        tokenLogId: tokenLogId ?? null,
        billing: { attempted: false },
      });
    }

    const amountCredits = getOutputTokenChargeCredits(billableTokens);
    if (amountCredits === 0) {
      return res.status(201).json({
        ok: true,
        tokenLogId,
        billing: { attempted: false, skippedReason: 'zero-amount' as const },
      });
    }

    try {
      const billing = await authorizeAndCharge({
        userId: req.user!.userId,
        actionType: action_type as BillingActionType,
        amountCredits,
        correlationId,
        metadata: {
          tokenLogId,
          feature,
          model,
          outputTokensBillable: billableTokens,
          outputTokensSource: typeof output_tokens === 'number' ? 'output_tokens' : 'total_tokens',
          creditsPerMillionOutput: getCreditsPerMillionOutputTokens(),
          ...(metadata ?? {}),
        },
      });

      if (billing.charged) {
        // Frontend listens to this event to refresh wallet badge/quota.
        // This route is also used by fire-and-forget logging, so keep it best-effort.
        res.setHeader('x-quota-updated', '1');
      }

      return res.status(201).json({
        ok: true,
        tokenLogId,
        billing: {
          attempted: true,
          charged: billing.charged,
          amountCredits: billing.amountCredits,
          balanceAfterCredits: billing.balanceAfterCredits,
          correlationId: billing.correlationId,
          skippedReason: billing.skippedReason,
        },
      });
    } catch (chargeErr) {
      if (chargeErr instanceof BillingInsufficientBalanceError) {
        return res.status(chargeErr.statusCode).json({ ok: true, tokenLogId, billingError: chargeErr.payload });
      }
      throw chargeErr;
    }
  } catch (err: any) {
    console.error('[token-logs/create]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// GET /api/token-logs/summary?from=&to=&... (cùng bộ lọc với GET /, không phân trang)
// Tổng hợp + facet trên toàn bộ dòng khớp WHERE — không chỉ trang hiện tại.
router.get('/summary', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có thể xem tổng hợp token logs' });
  }

  try {
    const parsed = parseTokenLogQuery(req.query as Record<string, string>);
    const body = await computeTokenLogAggregates(parsed);
    return res.json(body);
  } catch (err: any) {
    console.error('[token-logs/summary]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// GET /api/token-logs?from=ISO&to=ISO&feature=?&userId=?&page=1&pageSize=20
// Admin only — checks role from JWT
router.get('/', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có thể xem tất cả token logs' });
  }
  const q = req.query as Record<string, string>;
  const {
    page = '1',
    pageSize = '20',
    includeAggregate,
  } = q;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;
  const wantAggregate =
    includeAggregate === '1' ||
    String(includeAggregate ?? '').toLowerCase() === 'true' ||
    String(includeAggregate ?? '').toLowerCase() === 'yes';

  try {
    const parsed = parseTokenLogQuery(q);
    const { dateFilter, featureFilter, userFilter, emailFilter, actionTypeFilter } = parsed;

    const listQuery = sql`
      SELECT
        l.*,
        u.email,
        COUNT(*) OVER() AS total_count
      FROM public.token_usage_logs l
      JOIN auth.users u ON u.id = l.user_id
      WHERE 1=1
        ${dateFilter}
        ${featureFilter}
        ${userFilter}
        ${emailFilter}
        ${actionTypeFilter}
      ORDER BY l.created_at DESC
      LIMIT ${pageSizeNum} OFFSET ${offset}
    `;

    if (!wantAggregate) {
      const rows = await listQuery;
      const total = Number(rows[0]?.total_count ?? 0);
      return res.json({ rows, total, page: pageNum, pageSize: pageSizeNum });
    }

    const [rows, aggregate] = await Promise.all([listQuery, computeTokenLogAggregates(parsed)]);
    const total = Number(rows[0]?.total_count ?? 0);
    return res.json({
      rows,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      aggregate,
    });
  } catch (err: any) {
    console.error('[token-logs/list]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
