import React from 'react';
import type { TokenUsageSummary } from '../hooks/useTokenUsageLogs';

interface TokenUsageOverviewProps {
  summary: TokenUsageSummary;
}

export const TokenUsageOverview: React.FC<TokenUsageOverviewProps> = ({ summary }) => {
  const topUsers = [...summary.byUser]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5);

  const topFeatures = [...summary.byFeature]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Tổng tokens (theo filter)
        </p>
        <p className="text-2xl font-bold text-slate-900">
          {summary.totalTokens.toLocaleString('vi-VN')}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Top user theo tokens
        </p>
        {topUsers.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-1">
            {topUsers.map((u) => (
              <li key={u.userId} className="flex justify-between text-xs">
                <span className="text-slate-700 truncate">{u.userId}</span>
                <span className="font-semibold text-slate-900">
                  {u.totalTokens.toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Tokens theo feature
        </p>
        {topFeatures.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-1">
            {topFeatures.map((f) => (
              <li key={f.feature} className="flex justify-between text-xs">
                <span className="text-slate-700">{f.feature}</span>
                <span className="font-semibold text-slate-900">
                  {f.totalTokens.toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

