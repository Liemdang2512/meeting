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
  variant?: 'pill' | 'card';
}

export const QuotaBadge: React.FC<QuotaBadgeProps> = ({ onQuotaExhausted, variant = 'pill' }) => {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchQuota = useCallback(async () => {
    setError(false);
    try {
      const res = await authFetch('/quota');
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
        if (data.remaining === 0 && onQuotaExhausted) {
          onQuotaExhausted();
        }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [onQuotaExhausted]);

  useEffect(() => {
    fetchQuota();
    const handler = () => fetchQuota();
    window.addEventListener('quota-updated', handler);
    return () => window.removeEventListener('quota-updated', handler);
  }, [fetchQuota]);

  // ── Pill variant (header) ──
  if (variant === 'pill') {
    if (loading) {
      return <span className="px-3 py-1 w-20 h-6 bg-slate-100 rounded-full animate-pulse inline-block" />;
    }
    if (!quota || error) return null;
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
  }

  // ── Card variant (sidebar / profile) ──
  if (loading) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 h-10 animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
        <span className="text-slate-400">Không thể tải lượt dùng</span>
        <button onClick={fetchQuota} className="text-indigo-500 hover:text-indigo-700 font-medium">Thử lại</button>
      </div>
    );
  }

  if (!quota) return null;

  if (quota.unlimited) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span className="font-medium text-emerald-700">Không giới hạn lượt</span>
      </div>
    );
  }

  const used = quota.used ?? 0;
  const limit = quota.limit ?? 1;
  const isExhausted = (quota.remaining ?? 0) === 0;
  const pct = Math.round((used / limit) * 100);

  return (
    <div className={`w-full px-3 py-2.5 rounded-xl border text-xs flex flex-col gap-1.5 ${
      isExhausted ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${isExhausted ? 'text-amber-700' : 'text-slate-700'}`}>
          Lượt hôm nay
        </span>
        <span className={`font-bold ${isExhausted ? 'text-amber-700' : 'text-slate-800'}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isExhausted ? 'bg-amber-400' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isExhausted && (
        <p className="text-amber-600 text-[10px] font-medium">Hết lượt — nâng cấp để tiếp tục</p>
      )}
    </div>
  );
};
