import React, { useMemo, useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Coins, User, BarChart2 } from 'lucide-react';
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

const featureBadgeClass: Record<string, string> = {
  Transcription: 'bg-indigo-50 text-indigo-600',
  Summarization: 'bg-purple-50 text-purple-600',
  'Query AI': 'bg-sky-50 text-sky-600',
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

  const presetLabels: { id: DateRangePreset; label: string }[] = [
    { id: '7d', label: '7 ngày' },
    { id: '30d', label: '30 ngày' },
    { id: '365d', label: '1 năm' },
  ];

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">

      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight mb-2">
            Chi tiết sử dụng Token
          </h2>
          <p className="font-body text-on-surface-variant max-w-xl">
            Xem tổng token và lịch sử sử dụng của riêng bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range toggle */}
          <div className="flex bg-surface-container-low rounded-full p-1 shadow-sm">
            {presetLabels.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPreset(item.id);
                  setPage(1);
                }}
                className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                  preset === item.id
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Export CSV placeholder button */}
          <button className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-on-primary px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-5 h-5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </header>

      {/* Bento Grid Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">

        {/* Card 1: Tổng tokens */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container/30 flex items-center justify-center">
              <Coins className="text-primary w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">Tổng tokens (theo filter)</p>
            <h3 className="font-headline font-bold text-4xl text-on-surface">
              {isLoading ? '—' : summary.totalTokens.toLocaleString('vi-VN')}
            </h3>
          </div>
          <div className="mt-6 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[65%] rounded-full" />
          </div>
        </div>

        {/* Card 2: User ID */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container/30 flex items-center justify-center">
              <User className="text-secondary w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-2">Người dùng hiện tại</p>
            <h4 className="font-bold text-on-surface truncate">{currentUserId}</h4>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-secondary">Trang {page}</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              {logs.length} dòng
            </span>
          </div>
        </div>

        {/* Card 3: Token theo tính năng */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-on-surface">Token theo tính năng</p>
            <BarChart2 className="text-on-surface-variant/40 w-5 h-5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant">Transcription</span>
                <span className="text-on-surface">52%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full">
                <div className="h-full bg-primary w-[52%] rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant">AI Summarization</span>
                <span className="text-on-surface">38%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full">
                <div className="h-full bg-secondary w-[38%] rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant">Query AI</span>
                <span className="text-on-surface">10%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full">
                <div className="h-full bg-sky-400 w-[10%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Log Table Section */}
      <section className="bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-headline font-bold text-xl text-on-surface">Lịch sử token usage</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Tính năng
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Hành động
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                  Model
                </th>
                <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">
                  Tổng tokens
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-on-surface-variant font-medium">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-error font-medium">
                    {error}
                  </td>
                </tr>
              )}
              {!isLoading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-on-surface-variant font-medium">
                    Chưa có log nào trong khoảng thời gian này.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                logs.map((log) => {
                  const badgeCls = featureBadgeClass[log.feature] ?? 'bg-surface-container text-on-surface-variant';
                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-8 py-5 text-sm font-medium text-on-surface-variant font-mono">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badgeCls}`}>
                          {log.feature}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{log.actionType}</td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant hidden sm:table-cell">{log.model}</td>
                      <td className="px-8 py-5 text-sm font-bold text-primary text-right">
                        {log.totalTokens !== null ? log.totalTokens.toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/20">
          <p className="text-xs text-on-surface-variant">Trang {page} · {logs.length} dòng</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => page > 1 && setPage(page - 1)}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold">
              {page}
            </button>
            <button
              type="button"
              onClick={() => logs.length === 20 && setPage(page + 1)}
              disabled={logs.length < 20}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 mt-12 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center text-xs text-on-surface-variant">
        <p>© 2024 MoMai AI. Intelligent Documentation.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-primary transition-colors" href="#">Security</a>
        </div>
      </footer>
    </div>
  );
};
