import React, { useMemo, useState } from 'react';
import { useTokenUsageLogs } from '../token-usage-admin/hooks/useTokenUsageLogs';

interface MyTokenUsagePageProps {
  currentUserId: string;
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

export const MyTokenUsagePage: React.FC<MyTokenUsagePageProps> = ({ currentUserId }) => {
  const [preset, setPreset] = useState<DateRangePreset>('7d');
  const [page, setPage] = useState(1);

  const { from, to } = useMemo(() => getDateRange(preset), [preset]);

  const { logs, summary, isLoading, error } = useTokenUsageLogs({
    fromDate: from,
    toDate: to,
    userId: currentUserId,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-sans font-medium text-slate-800">My Token Usage</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Xem tổng token và lịch sử sử dụng của riêng bạn.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-500 whitespace-nowrap">
          User: <span className="font-medium border-b border-slate-200 px-1 text-slate-800">{currentUserId}</span>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 border-slate-200 p-6 shadow-sm rounded-xl border">
          <p className="text-xs font-medium text-indigo-100 mb-2">
            Tổng tokens (theo filter)
          </p>
          <p className="text-4xl font-sans font-medium text-white">
            {summary.totalTokens.toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="bg-white border-slate-200 shadow-sm rounded-xl border">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <p className="text-lg font-medium font-sans text-slate-800">Lịch sử token usage</p>
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
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Feature</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Model</th>
                <th className="px-4 py-3 text-right font-medium">Total tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-600 font-medium">
                    {error}
                  </td>
                </tr>
              )}
              {!isLoading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">
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
                    <td className="px-4 py-3 text-slate-600 font-medium text-xs">{log.feature}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium text-xs">{log.actionType}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs hidden sm:table-cell max-w-[120px] truncate">{log.model}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 text-base">
                      {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 font-medium text-sm bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
          >
            Trang trước
          </button>
          <button
            type="button"
            onClick={() => logs.length === 20 && setPage(page + 1)}
            disabled={logs.length < 20}
            className="px-4 py-2 font-medium text-sm bg-white border-slate-200 text-slate-800 shadow-sm rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
};

