import React from 'react';
import { Hash, Users, Layers } from 'lucide-react';
import type { TokenUsageAggregateScope, TokenUsageSummary } from '../hooks/useTokenUsageLogs';
import { getFeatureLabel } from '../labels';

interface TokenUsageOverviewProps {
  summary: TokenUsageSummary;
  aggregateScope?: TokenUsageAggregateScope;
}

const cardClass =
  'bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-xl shadow-on-surface/5';

export const TokenUsageOverview: React.FC<TokenUsageOverviewProps> = ({ summary, aggregateScope = 'off' }) => {
  const topUsers = [...summary.byUser]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5);

  const topFeatures = [...summary.byFeature]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className={`${cardClass} border-l-4 border-l-primary`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Hash className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Tổng token (theo bộ lọc)
            </p>
            <p className="font-display font-bold text-3xl sm:text-4xl text-primary tracking-tight tabular-nums">
              {summary.totalTokens.toLocaleString('vi-VN')}
            </p>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              {aggregateScope === 'server'
                ? 'Toàn bộ bản ghi khớp bộ lọc trên database (không chỉ trang bảng hiện tại).'
                : aggregateScope === 'page'
                  ? 'Đang tính trên các dòng hiển thị ở trang bảng — thử làm mới hoặc kiểm tra quyền admin / API.'
                  : 'Theo khoảng thời gian và bộ lọc hiện tại.'}
            </p>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Top người dùng
          </p>
        </div>
        {topUsers.length === 0 ? (
          <p className="text-sm font-medium text-on-surface-variant">Chưa có dữ liệu trong khoảng này.</p>
        ) : (
          <ul className="space-y-3">
            {topUsers.map((u) => (
              <li
                key={u.email ?? u.userId}
                className="flex justify-between items-center gap-3 text-sm border-b border-outline-variant/10 last:border-0 pb-3 last:pb-0"
              >
                <span className="text-on-surface-variant font-medium truncate">{u.email ?? u.userId}</span>
                <span className="font-display font-bold text-on-surface tabular-nums shrink-0">
                  {u.totalTokens.toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`${cardClass} bg-surface-container-low`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
            <Layers className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Theo tính năng
          </p>
        </div>
        {topFeatures.length === 0 ? (
          <p className="text-sm font-medium text-on-surface-variant">Chưa có dữ liệu trong khoảng này.</p>
        ) : (
          <ul className="space-y-3">
            {topFeatures.map((f) => (
              <li
                key={f.feature}
                className="flex justify-between items-center gap-3 text-sm border-b border-outline-variant/10 last:border-0 pb-3 last:pb-0"
              >
                <span className="text-on-surface-variant font-medium truncate">{getFeatureLabel(f.feature)}</span>
                <span className="font-display font-bold text-on-surface tabular-nums shrink-0">
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
