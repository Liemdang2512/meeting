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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-indigo-600 border-slate-200 p-6 shadow-sm rounded-xl border">
        <p className="text-xs font-medium text-indigo-100 mb-2">
          Tổng tokens (theo filter)
        </p>
        <p className="text-4xl font-sans font-medium text-white">
          {summary.totalTokens.toLocaleString('vi-VN')}
        </p>
      </div>
      <div className="bg-white border-slate-200 p-6 shadow-sm rounded-xl border">
        <p className="text-xs font-medium text-slate-800 mb-4">
          Top user theo tokens
        </p>
        {topUsers.length === 0 ? (
          <p className="text-sm font-medium text-slate-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-3">
            {topUsers.map((u) => (
              <li key={u.userId} className="flex justify-between text-sm items-center">
                <span className="text-slate-500 font-medium truncate pr-4">{u.userId}</span>
                <span className="font-sans font-medium text-slate-800 text-lg">
                  {u.totalTokens.toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-slate-50 border-slate-200 p-6 shadow-sm rounded-xl border">
        <p className="text-xs font-medium text-slate-800 mb-4">
          Tokens theo feature
        </p>
        {topFeatures.length === 0 ? (
          <p className="text-sm font-medium text-slate-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-3">
            {topFeatures.map((f) => (
              <li key={f.feature} className="flex justify-between text-sm items-center">
                <span className="text-slate-500 font-medium">{f.feature}</span>
                <span className="font-sans font-medium text-slate-800 text-lg">
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

