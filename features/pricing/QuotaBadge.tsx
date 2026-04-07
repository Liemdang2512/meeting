import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/api';

interface QuotaData {
  role: string;
  billingModel?: 'wallet';
  balance?: number;
  overdraftLimit?: number;
  legacyAccessUntil?: string | null;
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
        // Keep callback hook for compatibility, but phase 11 endpoint is wallet-only.
        if (typeof data?.remaining === 'number' && data.remaining === 0 && onQuotaExhausted) onQuotaExhausted();
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
    const balance = Number(quota.balance ?? 0);
    const isNegative = balance < 0;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
        isNegative ? 'text-amber-700 bg-amber-100' : 'text-indigo-700 bg-indigo-50'
      }`}>
        Ví: {balance.toLocaleString('vi-VN')} credits
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
        <span className="text-slate-400">Không thể tải số dư ví</span>
        <button onClick={fetchQuota} className="text-indigo-500 hover:text-indigo-700 font-medium">Thử lại</button>
      </div>
    );
  }

  if (!quota) return null;

  const balance = Number(quota.balance ?? 0);
  const overdraftLimit = Number(quota.overdraftLimit ?? -10000);
  const isNegative = balance < 0;

  return (
    <div className={`w-full px-3 py-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
      isNegative ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-semibold ${isNegative ? 'text-amber-700' : 'text-emerald-700'}`}>
          Số dư ví
        </span>
        <span className={`font-bold ${isNegative ? 'text-amber-700' : 'text-emerald-800'}`}>
          {balance.toLocaleString('vi-VN')} credits
        </span>
      </div>
      <p className={`text-[10px] ${isNegative ? 'text-amber-700' : 'text-emerald-700/90'}`}>
        Giới hạn âm: {overdraftLimit.toLocaleString('vi-VN')} credits
      </p>
    </div>
  );
};
