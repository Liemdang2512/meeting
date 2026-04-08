import { useCallback, useEffect, useMemo, useState } from 'react';
import { authFetch, getToken } from '../../../lib/api';
import type { TokenUsageLog, TokenUsageFeature, TokenUsageMetadata } from '../../../types';

export interface TokenUsageSummaryByUser {
  userId: string;
  email: string | null;
  totalTokens: number;
}

export interface TokenUsageSummaryByFeature {
  feature: TokenUsageFeature | 'unknown';
  totalTokens: number;
}

export interface TokenUsageSummary {
  totalTokens: number;
  byUser: TokenUsageSummaryByUser[];
  byFeature: TokenUsageSummaryByFeature[];
}

/** Giá trị facet từ toàn bộ dòng khớp bộ lọc (không giới hạn trang bảng). */
export interface TokenUsageFacets {
  emails: string[];
  userIds: string[];
  features: string[];
  actionTypes: string[];
}

export interface UseTokenUsageLogsOptions {
  fromDate?: Date;
  toDate?: Date;
  feature?: TokenUsageFeature | 'all';
  userId?: string;
  features?: string[];
  userIds?: string[];
  emails?: string[];
  actionTypes?: string[];
  page?: number;
  pageSize?: number;
  /** Gọi GET /token-logs/summary (chỉ admin). Đặt false cho trang user để tránh gọi API thừa. */
  fetchAggregate?: boolean;
}

/** `server` = GET /summary thành công (toàn DB khớp lọc). `page` = gọi summary nhưng lỗi → tổng hợp/chỉ số theo trang. `off` = không gọi summary. */
export type TokenUsageAggregateScope = 'off' | 'server' | 'page';

export interface UseTokenUsageLogsResult {
  logs: TokenUsageLog[];
  /** Tổng hợp trên toàn bộ dữ liệu khớp lọc (API /summary); fallback trang hiện tại nếu API lỗi. */
  summary: TokenUsageSummary;
  /** Facet cho bộ lọc nâng cao — từ toàn bộ tập khớp lọc. */
  facets: TokenUsageFacets | null;
  /** Phạm vi dữ liệu tổng hợp (thẻ overview / độ tin cậy facet). */
  aggregateScope: TokenUsageAggregateScope;
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => void;
}

export const buildSummary = (logs: TokenUsageLog[]): TokenUsageSummary => {
  const byUserMap = new Map<string, { totalTokens: number; userId: string; email: string | null }>();
  const byFeatureMap = new Map<string, number>();

  let totalTokens = 0;

  for (const log of logs) {
    const tokens = log.totalTokens ?? 0;
    totalTokens += tokens;

    const key = (log.userEmail ?? '').trim().toLowerCase() || log.userId;
    const prev = byUserMap.get(key);
    if (prev) {
      byUserMap.set(key, {
        totalTokens: prev.totalTokens + tokens,
        userId: prev.userId,
        email: prev.email ?? (log.userEmail ?? null),
      });
    } else {
      byUserMap.set(key, {
        totalTokens: tokens,
        userId: log.userId,
        email: log.userEmail ?? null,
      });
    }
    const featureKey = log.feature ?? 'unknown';
    byFeatureMap.set(featureKey, (byFeatureMap.get(featureKey) ?? 0) + tokens);
  }

  return {
    totalTokens,
    byUser: Array.from(byUserMap.values()).map((v) => ({
      userId: v.userId,
      email: v.email,
      totalTokens: v.totalTokens,
    })),
    byFeature: Array.from(byFeatureMap.entries()).map(([feature, value]) => ({
      feature: feature as TokenUsageFeature | 'unknown',
      totalTokens: value,
    })),
  };
};

function buildFilterSearchParams(options: UseTokenUsageLogsOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (options.fromDate && options.toDate) {
    params.set('from', options.fromDate.toISOString());
    params.set('to', options.toDate.toISOString());
  }
  if (options.feature && options.feature !== 'all') params.set('feature', options.feature);
  if (options.userId) params.set('userId', options.userId);
  if (options.features && options.features.length > 0) params.set('features', options.features.join(','));
  if (options.userIds && options.userIds.length > 0) params.set('userIds', options.userIds.join(','));
  if (options.emails && options.emails.length > 0) params.set('emails', options.emails.join(','));
  if (options.actionTypes && options.actionTypes.length > 0) {
    params.set('actionTypes', options.actionTypes.join(','));
  }
  return params;
}

function parseSummaryPayload(data: {
  totalTokens?: number;
  byUser?: { userId: string; email: string | null; totalTokens: number }[];
  byFeature?: { feature: string; totalTokens: number }[];
  facets?: {
    emails?: string[];
    userIds?: string[];
    features?: string[];
    actionTypes?: string[];
  };
}): { summary: TokenUsageSummary; facets: TokenUsageFacets | null } {
  const summary: TokenUsageSummary = {
    totalTokens: Number(data.totalTokens ?? 0),
    byUser: (data.byUser ?? []).map((u) => ({
      userId: u.userId,
      email: u.email ?? null,
      totalTokens: Number(u.totalTokens ?? 0),
    })),
    byFeature: (data.byFeature ?? []).map((f) => ({
      feature: (f.feature ?? 'unknown') as TokenUsageFeature | 'unknown',
      totalTokens: Number(f.totalTokens ?? 0),
    })),
  };
  const raw = data.facets;
  if (!raw) {
    return { summary, facets: null };
  }
  return {
    summary,
    facets: {
      emails: raw.emails ?? [],
      userIds: raw.userIds ?? [],
      features: raw.features ?? [],
      actionTypes: raw.actionTypes ?? [],
    },
  };
}

export const useTokenUsageLogs = (options: UseTokenUsageLogsOptions): UseTokenUsageLogsResult => {
  const [logs, setLogs] = useState<TokenUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [summaryFromServer, setSummaryFromServer] = useState<TokenUsageSummary | null>(null);
  const [facetsFromServer, setFacetsFromServer] = useState<TokenUsageFacets | null>(null);
  const [aggregateScope, setAggregateScope] = useState<TokenUsageAggregateScope>('off');

  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const fetchAggregate = options.fetchAggregate !== false;

  const summary = useMemo(() => {
    if (summaryFromServer) return summaryFromServer;
    return buildSummary(logs);
  }, [summaryFromServer, logs]);

  const fetchLogs = useCallback(async () => {
    if (!getToken()) {
      setLogs([]);
      setTotal(0);
      setSummaryFromServer(null);
      setFacetsFromServer(null);
      setAggregateScope('off');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filterParams = buildFilterSearchParams(options);
      const listParams = new URLSearchParams(filterParams);
      listParams.set('page', String(page));
      listParams.set('pageSize', String(pageSize));

      const [listRes, summaryRes] = fetchAggregate
        ? await Promise.all([
            authFetch(`/token-logs?${listParams.toString()}`),
            authFetch(`/token-logs/summary?${filterParams.toString()}`),
          ])
        : [await authFetch(`/token-logs?${listParams.toString()}`), null];

      if (!listRes.ok) {
        const err = await listRes.json().catch(() => ({ error: 'Loi khong xac dinh' }));
        setError(err.error ?? 'Khong the tai log token usage.');
        setLogs([]);
        setTotal(0);
        setSummaryFromServer(null);
        setFacetsFromServer(null);
        setAggregateScope('off');
        return;
      }

      const data = await listRes.json();
      const rows: any[] = Array.isArray(data) ? data : (data.rows ?? []);
      const nextTotal =
        typeof data?.total === 'number' ? data.total : typeof data?.total === 'string' ? Number(data.total) : rows.length;
      const mappedLogs: TokenUsageLog[] = rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.email ?? null,
        createdAt: row.created_at,
        feature: row.feature,
        actionType: row.action_type,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        totalTokens: row.total_tokens,
        model: row.model,
        metadata: (row.metadata ?? null) as TokenUsageMetadata | null,
      }));
      setLogs(mappedLogs);
      setTotal(Number.isFinite(nextTotal) ? nextTotal : mappedLogs.length);

      if (!fetchAggregate) {
        setSummaryFromServer(null);
        setFacetsFromServer(null);
        setAggregateScope('off');
      } else if (summaryRes?.ok) {
        const sumData = await summaryRes.json();
        const parsed = parseSummaryPayload(sumData);
        setSummaryFromServer(parsed.summary);
        setFacetsFromServer(parsed.facets);
        setAggregateScope('server');
      } else {
        setSummaryFromServer(null);
        setFacetsFromServer(null);
        setAggregateScope('page');
      }
    } catch (err: any) {
      setError(err.message ?? 'Khong the tai log token usage.');
      setLogs([]);
      setTotal(0);
      setSummaryFromServer(null);
      setFacetsFromServer(null);
      setAggregateScope('off');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.fromDate?.toISOString(),
    options.toDate?.toISOString(),
    options.feature,
    options.userId,
    (options.features ?? []).join(','),
    (options.userIds ?? []).join(','),
    (options.emails ?? []).join(','),
    (options.actionTypes ?? []).join(','),
    options.fetchAggregate,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    summary,
    facets: facetsFromServer,
    aggregateScope,
    isLoading,
    error,
    total,
    refetch: fetchLogs,
  };
};
