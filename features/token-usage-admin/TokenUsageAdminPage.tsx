import React, { useMemo, useState } from 'react';
import { useTokenUsageLogs } from './hooks/useTokenUsageLogs';
import { TokenUsageOverview } from './components/TokenUsageOverview';
import { TokenUsageTable } from './components/TokenUsageTable';
import type { TokenUsageFeature } from '../../types';

interface TokenUsageAdminPageProps {
  currentUserId: string;
  isAdmin: boolean;
}

type DateRangePreset = '7d' | '30d' | '365d';

const getDateRange = (preset: DateRangePreset): { from: Date; to: Date } => {
  const to = new Date();
  const from = new Date();

  if (preset === '7d') {
    from.setDate(to.getDate() - 7);
  } else if (preset === '30d') {
    from.setDate(to.getDate() - 30);
  } else {
    from.setFullYear(to.getFullYear() - 1);
  }

  return { from, to };
};

export const TokenUsageAdminPage: React.FC<TokenUsageAdminPageProps> = ({
  currentUserId,
  isAdmin,
}) => {
  const [preset, setPreset] = useState<DateRangePreset>('7d');
  const [featureFilter, setFeatureFilter] = useState<TokenUsageFeature | 'all'>('all');
  const [page, setPage] = useState(1);

  const { from, to } = useMemo(() => getDateRange(preset), [preset]);

  const { logs, summary, isLoading, error, refetch } = useTokenUsageLogs({
    fromDate: from,
    toDate: to,
    feature: featureFilter,
    page,
    pageSize: 20,
  });

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto mt-8 bg-white border-red-500 shadow-sm rounded-xl p-8 text-center">
        <h2 className="text-2xl font-medium font-sans text-red-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-sm font-medium text-red-600">
          Trang này chỉ dành cho admin. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là nhầm lẫn.
        </p>
      </div>
    );
  }

  const handleExportCsv = () => {
    if (logs.length === 0) return;

    const header = [
      'timestamp',
      'user_id',
      'feature',
      'action_type',
      'model',
      'input_tokens',
      'output_tokens',
      'total_tokens',
      'metadata',
    ];

    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.userId,
      log.feature,
      log.actionType,
      log.model,
      log.inputTokens ?? '',
      log.outputTokens ?? '',
      log.totalTokens ?? '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    const csvContent = [header, ...rows]
      .map((cols) =>
        cols
          .map((value) => {
            const str = String(value ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fromLabel = from.toISOString().slice(0, 10);
    const toLabel = to.toISOString().slice(0, 10);
    link.download = `token_usage_${fromLabel}_to_${toLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-sans font-medium text-slate-800">Admin Token Usage</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Xem và export log token usage theo user, feature và thời gian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refetch}
            className="px-4 py-2 text-sm font-medium bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl transition-all active:bg-slate-50 border"
          >
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 border-slate-200 text-white shadow-sm rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 border"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">Khoảng thời gian:</span>
          {([
            { id: '7d', label: '7 ngày' },
            { id: '30d', label: '30 ngày' },
            { id: '365d', label: '1 năm' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPreset(item.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 border text-xs font-medium transition-all ${ preset === item.id ? 'border-slate-200 bg-indigo-900 text-white shadow-sm rounded-xl translate-y-px' : 'border-slate-200 text-slate-800 bg-white hover:bg-slate-50 shadow-sm rounded-xl' }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">Feature:</span>
          {(['all', 'minutes', 'file-split', 'token-usage-admin', 'my-token-usage', 'other'] as const).map(
            (feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => {
                  setFeatureFilter(feature === 'all' ? 'all' : feature);
                  setPage(1);
                }}
                className={`px-3 py-1.5 border text-xs font-medium transition-all ${ featureFilter === feature ? 'border-slate-200 bg-indigo-900 text-white shadow-sm rounded-xl translate-y-px' : 'border-slate-200 text-slate-800 bg-white hover:bg-slate-50 shadow-sm rounded-xl' }`}
              >
                {feature === 'all' ? 'Tất cả' : feature}
              </button>
            ),
          )}
        </div>
        <div className="flex-1 text-right text-xs text-slate-500 font-medium whitespace-nowrap">
          Đang xem: <span className="font-medium border-b border-slate-200 px-1 text-slate-800">{currentUserId}</span> (admin)
        </div>
      </div>

      <TokenUsageOverview summary={summary} />
      <TokenUsageTable
        logs={logs}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={20}
        onPageChange={setPage}
      />
    </div>
  );
};

