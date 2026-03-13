import { useCallback, useEffect, useMemo, useState } from 'react';
import { authFetch, getToken } from '../../../lib/api';
import type { TokenUsageLog, TokenUsageFeature, TokenUsageMetadata } from '../../../types';

export interface TokenUsageSummaryByUser {
  userId: string;
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

export interface UseTokenUsageLogsOptions {
  fromDate: Date;
  toDate: Date;
  feature?: TokenUsageFeature | 'all';
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface UseTokenUsageLogsResult {
  logs: TokenUsageLog[];
  summary: TokenUsageSummary;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const buildSummary = (logs: TokenUsageLog[]): TokenUsageSummary => {
  const byUserMap = new Map<string, number>();
  const byFeatureMap = new Map<string, number>();

  let totalTokens = 0;

  for (const log of logs) {
    const tokens = log.totalTokens ?? 0;
    totalTokens += tokens;

    byUserMap.set(log.userId, (byUserMap.get(log.userId) ?? 0) + tokens);
    const featureKey = log.feature ?? 'unknown';
    byFeatureMap.set(featureKey, (byFeatureMap.get(featureKey) ?? 0) + tokens);
  }

  return {
    totalTokens,
    byUser: Array.from(byUserMap.entries()).map(([userId, value]) => ({
      userId,
      totalTokens: value,
    })),
    byFeature: Array.from(byFeatureMap.entries()).map(([feature, value]) => ({
      feature: feature as TokenUsageFeature | 'unknown',
      totalTokens: value,
    })),
  };
};

export const useTokenUsageLogs = (options: UseTokenUsageLogsOptions): UseTokenUsageLogsResult => {
  const [logs, setLogs] = useState<TokenUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  // Memoize summary - chỉ tính lại khi logs thực sự thay đổi
  const summary = useMemo(() => buildSummary(logs), [logs]);

  const fetchLogs = useCallback(async () => {
    if (!getToken()) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fromIso = options.fromDate.toISOString();
      const toIso = options.toDate.toISOString();
      const params = new URLSearchParams({
        from: fromIso,
        to: toIso,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (options.feature && options.feature !== 'all') {
        params.set('feature', options.feature);
      }
      if (options.userId) {
        params.set('userId', options.userId);
      }
      const res = await authFetch(`/token-logs?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Loi khong xac dinh' }));
        setError(err.error ?? 'Khong the tai log token usage.');
        setLogs([]);
        return;
      }
      const data: any[] = await res.json();
      const mappedLogs: TokenUsageLog[] = data.map((row) => ({
        id: row.id,
        userId: row.user_id,
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
    } catch (err: any) {
      setError(err.message ?? 'Khong the tai log token usage.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.fromDate, options.toDate, options.feature, options.userId, page, pageSize]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    summary,
    isLoading,
    error,
    refetch: fetchLogs,
  };
};

