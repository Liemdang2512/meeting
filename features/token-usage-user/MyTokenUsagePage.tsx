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
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Token Usage</h2>
          <p className="text-xs text-slate-500">
            Xem tổng token và lịch sử sử dụng của riêng bạn.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          User: <span className="font-semibold">{currentUserId}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-600">Khoảng thời gian:</span>
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
              className={`px-2 py-1 rounded-full border text-xs ${
                preset === item.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Tổng tokens (theo filter)
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {summary.totalTokens.toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Lịch sử token usage</p>
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
                <th className="px-3 py-2 text-left font-semibold">Feature</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
                <th className="px-3 py-2 text-left font-semibold">Model</th>
                <th className="px-3 py-2 text-right font-semibold">Total tokens</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              )}
              {!isLoading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
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
                    <td className="px-3 py-2 text-slate-600">{log.feature}</td>
                    <td className="px-3 py-2 text-slate-600">{log.actionType}</td>
                    <td className="px-3 py-2 text-slate-600">{log.model}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                      {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            Trang trước
          </button>
          <button
            type="button"
            onClick={() => logs.length === 20 && setPage(page + 1)}
            disabled={logs.length < 20}
            className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
};

