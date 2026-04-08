import React, { useMemo, useState } from 'react';
import { RefreshCw, Download, Calendar, ChevronDown, X } from 'lucide-react';
import { useTokenUsageLogs } from './hooks/useTokenUsageLogs';
import { TokenUsageOverview } from './components/TokenUsageOverview';
import { TokenUsageTable } from './components/TokenUsageTable';
import { ACTION_LABELS, getActionLabel } from './labels';

interface TokenUsageAdminPageProps {
  currentUserId: string;
  isAdmin: boolean;
}

type DateMode = '7d' | '30d' | '365d' | 'month' | 'custom' | 'all';

const now = new Date();

const getPresetRange = (mode: DateMode): { from?: Date; to?: Date } => {
  const to = new Date();
  const from = new Date();
  if (mode === '7d') {
    from.setDate(to.getDate() - 7);
    return { from, to };
  }
  if (mode === '30d') {
    from.setDate(to.getDate() - 30);
    return { from, to };
  }
  if (mode === '365d') {
    from.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  return {};
};

const filterDropdownShell =
  'relative flex items-center min-w-[min(100%,11rem)] flex-1 sm:flex-initial sm:min-w-[10.5rem] rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm overflow-hidden';

const filterLabelClass = 'text-[10px] font-bold text-on-surface-variant uppercase tracking-wide whitespace-nowrap pl-3 shrink-0';

const ghostSelect =
  'absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0';

const filterValueRow = 'pointer-events-none flex flex-1 items-center justify-between gap-1 pr-2 py-2.5 min-h-[42px]';

export const TokenUsageAdminPage: React.FC<TokenUsageAdminPageProps> = ({
  currentUserId,
  isAdmin,
}) => {
  const [dateMode, setDateMode] = useState<DateMode>('30d');
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);

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

  const { logs, summary, facets, aggregateScope, isLoading, error, total, refetch } = useTokenUsageLogs({
    fromDate,
    toDate,
    feature: 'all',
    emails: selectedEmails,
    actionTypes: selectedActionTypes,
    page,
    pageSize,
    fetchAggregate: true,
  });

  const availableEmails = useMemo(() => {
    const set = new Set<string>();
    if (facets !== null) {
      for (const e of facets.emails) if (e) set.add(e);
    } else {
      for (const l of logs) if (l.userEmail) set.add(l.userEmail);
    }
    for (const e of selectedEmails) set.add(e);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [facets, logs, selectedEmails]);

  const availableActionTypes = useMemo(() => {
    const set = new Set<string>();
    if (facets !== null) {
      for (const a of facets.actionTypes) if (a) set.add(a);
    } else {
      for (const l of logs) if (l.actionType) set.add(l.actionType);
    }
    for (const a of selectedActionTypes) set.add(a);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [facets, logs, selectedActionTypes]);

  const timeRangeLabel = useMemo(() => {
    switch (dateMode) {
      case '7d':
        return '7 ngày qua';
      case '30d':
        return '30 ngày qua';
      case '365d':
        return '1 năm qua';
      case 'month':
        return `Tháng ${filterMonth}/${filterYear}`;
      case 'custom':
        return customFrom && customTo ? `${customFrom} → ${customTo}` : 'Khoảng tùy chỉnh';
      case 'all':
        return 'Toàn thời gian';
      default:
        return '';
    }
  }, [dateMode, filterMonth, filterYear, customFrom, customTo]);

  type ActiveChip = { id: string; label: string; onRemove: () => void };

  const activeChips = useMemo((): ActiveChip[] => {
    const chips: ActiveChip[] = [];

    chips.push({
      id: 'time',
      label: `Thời gian: ${timeRangeLabel}`,
      onRemove: () => {
        setDateMode('all');
        setCustomFrom('');
        setCustomTo('');
        setPage(1);
      },
    });

    for (const email of selectedEmails) {
      chips.push({
        id: `email:${email}`,
        label: `Email: ${email}`,
        onRemove: () => {
          setSelectedEmails((prev) => prev.filter((e) => e !== email));
          setPage(1);
        },
      });
    }
    for (const a of selectedActionTypes) {
      const name = (ACTION_LABELS as Record<string, string | undefined>)[a] ?? a;
      chips.push({
        id: `act:${a}`,
        label: `Hành động: ${name}`,
        onRemove: () => {
          setSelectedActionTypes((prev) => prev.filter((x) => x !== a));
          setPage(1);
        },
      });
    }

    return chips;
  }, [timeRangeLabel, selectedEmails, selectedActionTypes]);

  const clearAllFilters = () => {
    setDateMode('30d');
    setFilterMonth(String(now.getMonth() + 1));
    setFilterYear(String(now.getFullYear()));
    setCustomFrom('');
    setCustomTo('');
    setSelectedEmails([]);
    setSelectedActionTypes([]);
    setPage(1);
  };

  const hasNonDefaultFilters =
    dateMode !== '30d' || selectedEmails.length > 0 || selectedActionTypes.length > 0;

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto mt-8 bg-surface-container-lowest border border-error/20 shadow-sm rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-headline font-bold text-error mb-2">Không có quyền truy cập</h2>
        <p className="text-sm font-medium text-on-surface-variant">
          Chỉ quản trị viên mới xem được bảng điều khiển token. Liên hệ admin nếu bạn cần quyền.
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
    <div className="space-y-8 mt-6">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="space-y-1 max-w-2xl">
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">
            Bảng điều khiển token
          </h2>
          <p className="text-on-surface-variant max-w-lg text-sm">
            Theo dõi mức dùng API theo thời gian, người dùng và tính năng; xuất CSV khi cần báo cáo.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto md:items-end">
          <div className="flex flex-wrap items-end justify-start md:justify-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap">Dòng/trang</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1 focus:outline-none cursor-pointer min-h-[34px]"
              >
                {[20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={refetch}
              className="px-5 py-2.5 flex items-center gap-2 bg-surface-container-high text-primary font-bold text-sm rounded-full hover:bg-surface-container-highest transition-all active:scale-95"
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-6 py-2.5 flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm rounded-full shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95 disabled:opacity-45 disabled:pointer-events-none"
            >
              <Download size={16} />
              Xuất CSV
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium text-right">
            Admin · <span className="font-mono text-on-surface">{currentUserId}</span>
          </p>
        </div>
      </div>

      {/* Bộ lọc kiểu dashboard: hàng dropdown + chip đang hoạt động */}
      <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/80 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-stretch">
          {/* Thời gian */}
          <div className={filterDropdownShell}>
            <span className={filterLabelClass}>Thời gian</span>
            <select
              className={ghostSelect}
              aria-label="Chọn khoảng thời gian"
              value={dateMode}
              onChange={(e) => {
                setDateMode(e.target.value as DateMode);
                setPage(1);
              }}
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="365d">1 năm qua</option>
              <option value="month">Theo tháng</option>
              <option value="custom">Khoảng ngày</option>
              <option value="all">Toàn thời gian</option>
            </select>
            <div className={filterValueRow}>
              <Calendar className="w-4 h-4 text-primary shrink-0 ml-1" aria-hidden />
              <span className="text-sm font-semibold text-on-surface truncate text-right flex-1">{timeRangeLabel}</span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden />
            </div>
          </div>

          {/* Email */}
          <div className={filterDropdownShell}>
            <span className={filterLabelClass}>Email</span>
            <select
              className={ghostSelect}
              aria-label="Lọc theo email"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__clear') {
                  setSelectedEmails([]);
                  setPage(1);
                } else if (v) {
                  setSelectedEmails((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  setPage(1);
                }
                e.target.value = '';
              }}
            >
              <option value="">Thêm…</option>
              <option value="__clear">Tất cả (bỏ lọc email)</option>
              {availableEmails.map((email) => (
                <option key={email} value={email} disabled={selectedEmails.includes(email)}>
                  {selectedEmails.includes(email) ? `✓ ${email}` : email}
                </option>
              ))}
            </select>
            <div className={filterValueRow}>
              <span className="text-sm font-semibold text-on-surface truncate flex-1 text-right pr-1">
                {selectedEmails.length === 0 ? 'Tất cả' : `${selectedEmails.length} đã chọn`}
              </span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden />
            </div>
          </div>

          {/* Hành động */}
          <div className={filterDropdownShell}>
            <span className={filterLabelClass}>Hành động</span>
            <select
              className={ghostSelect}
              aria-label="Lọc theo loại hành động"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__clear') {
                  setSelectedActionTypes([]);
                  setPage(1);
                } else if (v) {
                  setSelectedActionTypes((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  setPage(1);
                }
                e.target.value = '';
              }}
            >
              <option value="">Thêm…</option>
              <option value="__clear">Tất cả (bỏ lọc hành động)</option>
              {availableActionTypes.map((a) => (
                <option key={a} value={a} disabled={selectedActionTypes.includes(a)}>
                  {selectedActionTypes.includes(a) ? `✓ ${getActionLabel(a)}` : getActionLabel(a)}
                </option>
              ))}
            </select>
            <div className={filterValueRow}>
              <span className="text-sm font-semibold text-on-surface truncate flex-1 text-right pr-1">
                {selectedActionTypes.length === 0 ? 'Tất cả' : `${selectedActionTypes.length} đã chọn`}
              </span>
              <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden />
            </div>
          </div>
        </div>

        {(dateMode === 'month' || dateMode === 'custom') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/10">
            {dateMode === 'month' && (
              <>
                <select
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-on-surface bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-on-surface bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
            {dateMode === 'custom' && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-semibold border border-outline-variant/20 rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface focus:outline-none"
                />
                <span className="text-xs text-on-surface-variant">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-semibold border border-outline-variant/20 rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface focus:outline-none"
                />
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-3 border-t border-outline-variant/15">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide shrink-0">
            Bộ lọc đang hoạt động:
          </span>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 text-primary pl-3 pr-1 py-1 text-xs font-semibold border border-primary/15"
              >
                <span className="max-w-[220px] sm:max-w-[280px] truncate">{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors"
                  aria-label={`Bỏ ${chip.label}`}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </span>
            ))}
            {hasNonDefaultFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-primary hover:underline ml-1"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          {isLoading
            ? 'Đang tải dữ liệu…'
            : aggregateScope === 'server'
              ? 'Danh sách email / hành động và thẻ tổng hợp lấy từ toàn bộ log khớp bộ lọc trên server (không giới hạn trang bảng).'
              : aggregateScope === 'page'
                ? 'Không tải được tổng hợp từ server — danh sách lọc và số liệu thẻ có thể chỉ theo trang hiện tại.'
                : 'Chưa có tổng hợp server (ví dụ chưa đăng nhập).'}
        </p>
      </div>

      <TokenUsageOverview summary={summary} aggregateScope={aggregateScope} />
      <TokenUsageTable
        logs={logs}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
};
