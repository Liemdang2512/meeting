import React from 'react';
import type { TokenUsageLog } from '../../../types';

interface TokenUsageTableProps {
  logs: TokenUsageLog[];
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const TokenUsageTable: React.FC<TokenUsageTableProps> = ({
  logs,
  isLoading,
  error,
  page,
  pageSize,
  onPageChange,
}) => {
  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (logs.length === pageSize) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Chi tiết token usage</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Trang {page}</span>
          <span className="text-slate-300">•</span>
          <span>{logs.length} dòng</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Time</th>
              <th className="px-3 py-2 text-left font-semibold">User</th>
              <th className="px-3 py-2 text-left font-semibold">Feature</th>
              <th className="px-3 py-2 text-left font-semibold">Action</th>
              <th className="px-3 py-2 text-left font-semibold">Model</th>
              <th className="px-3 py-2 text-right font-semibold">Input</th>
              <th className="px-3 py-2 text-right font-semibold">Output</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2 text-left font-semibold">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                  Chưa có log nào trong khoảng thời gian này.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{log.userId}</td>
                  <td className="px-3 py-2 text-slate-600">{log.feature}</td>
                  <td className="px-3 py-2 text-slate-600">{log.actionType}</td>
                  <td className="px-3 py-2 text-slate-600">{log.model}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {log.inputTokens !== null ? log.inputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {log.outputTokens !== null ? log.outputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-[220px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={handlePrev}
          disabled={page <= 1}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          Trang trước
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={logs.length < pageSize}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          Trang sau
        </button>
      </div>
    </div>
  );
};

