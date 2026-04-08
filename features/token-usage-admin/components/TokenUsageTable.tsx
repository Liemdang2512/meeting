import React from 'react';
import type { TokenUsageLog } from '../../../types';
import { getFeatureLabel, getActionLabel } from '../labels';

interface TokenUsageTableProps {
  logs: TokenUsageLog[];
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const TokenUsageTable: React.FC<TokenUsageTableProps> = ({
  logs,
  isLoading,
  error,
  page,
  pageSize,
  total,
  onPageChange,
}) => {
  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page * pageSize < total) {
      onPageChange(page + 1);
    }
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5 overflow-hidden border border-outline-variant/5">
      <div className="px-6 py-5 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-headline font-bold text-lg text-on-surface">Nhật ký chi tiết</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Từng lần gọi mô hình — có thể xuất CSV để phân tích thêm.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-on-surface-variant whitespace-nowrap">
          <span className="px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/15">
            Trang {page} / {totalPages}
          </span>
          <span className="hidden sm:inline text-outline-variant">|</span>
          <span>
            {logs.length} dòng · tổng {total.toLocaleString('vi-VN')}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[880px]">
          <thead>
            <tr className="bg-surface-container-low/80">
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Thời gian</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Mã user</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tính năng</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Hành động</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest hidden sm:table-cell">Model</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Vào</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Ra</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Tổng</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest hidden md:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoading && (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center">
                  <div className="inline-flex flex-col items-center gap-3 text-on-surface-variant font-medium text-sm">
                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Đang tải nhật ký…
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center text-error font-medium text-sm">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center text-on-surface-variant font-medium text-sm">
                  Không có bản ghi nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors group">
                  <td className="px-6 py-4 text-on-surface font-mono text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface max-w-[200px] truncate">
                    {log.userEmail ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant font-mono text-[11px] max-w-[160px] truncate">
                    {log.userId}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                    {getFeatureLabel(log.feature)}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                    {getActionLabel(log.actionType)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant font-mono text-[11px] hidden sm:table-cell max-w-[120px] truncate">
                    {log.model}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-on-surface tabular-nums">
                    {log.inputTokens !== null ? log.inputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-on-surface tabular-nums">
                    {log.outputTokens !== null ? log.outputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-display font-bold text-sm text-primary tabular-nums group-hover:text-secondary transition-colors">
                    {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant/80 font-mono text-[11px] max-w-[220px] truncate hidden md:table-cell">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/50">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          className="px-5 py-2.5 font-bold text-sm rounded-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Trước
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className="px-5 py-2.5 font-bold text-sm rounded-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sau →
        </button>
      </div>
    </div>
  );
};
