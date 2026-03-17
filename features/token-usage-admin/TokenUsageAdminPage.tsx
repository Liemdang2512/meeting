import React, { useMemo, useState } from 'react';
import { useTokenUsageLogs, buildSummary } from './hooks/useTokenUsageLogs';
import { TokenUsageOverview } from './components/TokenUsageOverview';
import { TokenUsageTable } from './components/TokenUsageTable';
import type { TokenUsageFeature } from '../../types';

interface TokenUsageAdminPageProps {
  currentUserId: string;
  isAdmin: boolean;
}

type DateMode = '7d' | '30d' | '365d' | 'month' | 'custom' | 'all';

const now = new Date();

const getPresetRange = (mode: DateMode): { from?: Date; to?: Date } => {
  const to = new Date();
  const from = new Date();
  if (mode === '7d') { from.setDate(to.getDate() - 7); return { from, to }; }
  if (mode === '30d') { from.setDate(to.getDate() - 30); return { from, to }; }
  if (mode === '365d') { from.setFullYear(to.getFullYear() - 1); return { from, to }; }
  return {};
};

export const TokenUsageAdminPage: React.FC<TokenUsageAdminPageProps> = ({
  currentUserId,
  isAdmin,
}) => {
  const [dateMode, setDateMode] = useState<DateMode>('30d');
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [featureFilter, setFeatureFilter] = useState<TokenUsageFeature | 'all'>('all');
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');

  const { fromDate, toDate } = useMemo(() => {
    if (dateMode === 'all') return { fromDate: undefined, toDate: undefined };
    if (dateMode === 'month') {
      const m = parseInt(filterMonth, 10);
      const y = parseInt(filterYear, 10);
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0, 23, 59, 59, 999);
      return { fromDate: from, toDate: to };
    }
    if (dateMode === 'custom') {
      if (!customFrom || !customTo) return { fromDate: undefined, toDate: undefined };
      return { fromDate: new Date(customFrom), toDate: new Date(customTo + 'T23:59:59') };
    }
    const { from, to } = getPresetRange(dateMode);
    return { fromDate: from, toDate: to };
  }, [dateMode, filterMonth, filterYear, customFrom, customTo]);

  const { logs, summary, isLoading, error, refetch } = useTokenUsageLogs({
    fromDate,
    toDate,
    feature: featureFilter,
    page,
    pageSize: 20,
  });

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (!emailFilter.trim()) return true;
        const email = log.userEmail ?? '';
        return email.toLowerCase().includes(emailFilter.trim().toLowerCase());
      }),
    [logs, emailFilter],
  );

  const filteredSummary = useMemo(() => buildSummary(filteredLogs), [filteredLogs]);

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
    const fromLabel = fromDate ? fromDate.toISOString().slice(0, 10) : 'all';
    const toLabel = toDate ? toDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    link.download = `token_usage_${fromLabel}_to_${toLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-sans font-medium text-slate-800">Sử dụng token (Admin)</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Xem và xuất log sử dụng token theo người dùng, tính năng và thời gian.
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
            Xuất CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4 text-xs">
        {/* Lọc thời gian */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-slate-800">Thời gian:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: '7d' as const, label: '7 ngày' },
              { id: '30d' as const, label: '30 ngày' },
              { id: '365d' as const, label: '1 năm' },
              { id: 'month' as const, label: 'Theo tháng' },
              { id: 'custom' as const, label: 'Tùy chỉnh' },
              { id: 'all' as const, label: 'Tất cả' },
            ]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setDateMode(item.id); setPage(1); }}
                className={`px-3 py-1.5 border text-xs font-medium transition-all ${ dateMode === item.id ? 'border-slate-200 bg-indigo-900 text-white shadow-sm rounded-xl translate-y-px' : 'border-slate-200 text-slate-800 bg-white hover:bg-slate-50 shadow-sm rounded-xl' }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Chọn tháng/năm */}
          {dateMode === 'month' && (
            <div className="flex items-center gap-2 mt-1">
              <select
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-xl bg-white text-slate-800 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-xl bg-white text-slate-800 focus:outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
          {/* Chọn khoảng ngày tùy chỉnh */}
          {dateMode === 'custom' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500">Từ</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-xl bg-white text-slate-800 focus:outline-none"
              />
              <span className="text-slate-500">đến</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-xl bg-white text-slate-800 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Lọc tính năng */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-slate-800">Tính năng:</span>
          <div className="flex items-center gap-1.5">
            {([
              { value: 'all' as const, label: 'Tất cả' },
              { value: 'minutes' as const, label: 'Biên bản họp' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setFeatureFilter(value); setPage(1); }}
                className={`px-3 py-1.5 border text-xs font-medium transition-all ${ featureFilter === value ? 'border-slate-200 bg-indigo-900 text-white shadow-sm rounded-xl translate-y-px' : 'border-slate-200 text-slate-800 bg-white hover:bg-slate-50 shadow-sm rounded-xl' }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lọc email */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-slate-800">Email:</span>
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value); setPage(1); }}
            placeholder="Nhập email để lọc..."
            className="px-3 py-1.5 border text-xs font-medium rounded-xl border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 text-right text-xs text-slate-500 font-medium whitespace-nowrap self-start pt-6">
          Đang xem: <span className="font-medium border-b border-slate-200 px-1 text-slate-800">{currentUserId}</span> (admin)
        </div>
      </div>

      <TokenUsageOverview summary={filteredSummary} />
      <TokenUsageTable
        logs={filteredLogs}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={20}
        onPageChange={setPage}
      />
    </div>
  );
};

