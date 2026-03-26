import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/api';

interface QuotaData {
  role: string;
  unlimited?: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
}

interface QuotaBadgeProps {
  onQuotaExhausted?: () => void;
}

export const QuotaBadge: React.FC<QuotaBadgeProps> = ({ onQuotaExhausted }) => {
  const [quota, setQuota] = useState<QuotaData | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await authFetch('/quota');
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
        if (data.remaining === 0 && onQuotaExhausted) {
          onQuotaExhausted();
        }
      }
    } catch {
      // Silent fail — quota badge is non-critical
    }
  }, [onQuotaExhausted]);

  useEffect(() => {
    fetchQuota();
    const handler = () => fetchQuota();
    window.addEventListener('quota-updated', handler);
    return () => window.removeEventListener('quota-updated', handler);
  }, [fetchQuota]);

  if (!quota) return null;

  if (quota.unlimited) {
    return (
      <span className="px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
        Unlimited
      </span>
    );
  }

  const isExhausted = quota.remaining === 0;
  return (
    <span
      className={`px-3 py-1 text-xs font-medium rounded-full ${
        isExhausted
          ? 'text-amber-700 bg-amber-100'
          : 'text-emerald-700 bg-emerald-100'
      }`}
    >
      Hôm nay: {quota.used}/{quota.limit} lượt
    </span>
  );
};
