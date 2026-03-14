import React from 'react';
import type { TokenUsageLog } from '../../../types';
import { getFeatureLabel, getActionLabel } from '../labels';

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
    <div className="bg-white border-slate-200 shadow-sm rounded-xl border">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <p className="text-lg font-medium font-sans text-slate-800">Chi tiết sử dụng token</p>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span>Trang {page}</span>
          <span className="text-slate-300">•</span>
          <span>{logs.length} dòng</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead className="bg-indigo-900 text-white border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Thời gian</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Mã user</th>
              <th className="px-4 py-3 text-left font-medium">Tính năng</th>
              <th className="px-4 py-3 text-left font-medium">Hành động</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Model</th>
              <th className="px-4 py-3 text-right font-medium">Đầu vào</th>
              <th className="px-4 py-3 text-right font-medium">Đầu ra</th>
              <th className="px-4 py-3 text-right font-medium">Tổng</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Dữ liệu kèm theo</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-red-600 font-medium">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Chưa có log nào trong khoảng thời gian này.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 font-medium font-mono text-xs">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">
                    {log.userEmail ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[160px] truncate">{log.userId}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium text-xs">{getFeatureLabel(log.feature)}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium text-xs">{getActionLabel(log.actionType)}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs hidden sm:table-cell max-w-[120px] truncate">{log.model}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono text-xs">
                    {log.inputTokens !== null ? log.inputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono text-xs">
                    {log.outputTokens !== null ? log.outputTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 text-base">
                    {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs max-w-[220px] truncate hidden md:table-cell">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
        <button
          type="button"
          onClick={handlePrev}
          disabled={page <= 1}
          className="px-4 py-2 font-medium text-sm bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
        >
          Trang trước
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={logs.length < pageSize}
          className="px-4 py-2 font-medium text-sm bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
        >
          Trang sau
        </button>
      </div>
    </div>
  );
};

