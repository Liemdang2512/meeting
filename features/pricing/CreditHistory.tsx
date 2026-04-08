import React, { useEffect, useState, useCallback } from 'react';
import { authFetch } from '../../lib/api';

const EVENT_LABELS: Record<string, string> = {
  debit: 'Trừ tiền',
  topup: 'Nạp tiền',
  refund: 'Hoàn tiền',
  migration_grant: 'Credit khởi tạo',
  migration_expire: 'Hết hạn credit',
  adjustment: 'Điều chỉnh',
};

const ACTION_LABELS: Record<string, string> = {
  'transcribe-basic': 'Voice to Text',
  'transcribe-deep': 'Voice to Text (nâng cao)',
  'transcribe-synthesize': 'Gộp file',
  'minutes-generate': 'Tạo biên bản',
  'mindmap-generate': 'Tạo Mindmap',
  'checklist-generate': 'Tạo Checklist',
  'diagram-generate': 'Tạo Sơ đồ',
  other: 'Khác',
};

interface LedgerRow {
  id: string;
  event_type: string;
  action_type: string | null;
  amount_credits: number;
  balance_after_credits: number;
  correlation_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const CreditHistory: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/wallet/history?page=${page}`);
      if (!res.ok) {
        setError('Không thể tải lịch sử giao dịch.');
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(currentPage);
  }, [currentPage, loadPage]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="mt-10">
      <h2 className="font-headline font-bold text-xl text-on-surface mb-4">Lịch sử giao dịch</h2>

      {loading && (
        <p className="text-sm text-on-surface-variant py-4 text-center">Đang tải...</p>
      )}

      {error && !loading && (
        <p className="text-sm text-error py-4 text-center">{error}</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-on-surface-variant py-4 text-center">Chưa có giao dịch nào.</p>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-left">
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Tính năng</th>
                  <th className="px-4 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-4 py-3 font-semibold text-right">Số dư sau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((row) => {
                  const isNegative = row.amount_credits < 0;
                  const amountClass = isNegative ? 'text-error font-semibold' : 'text-primary font-semibold';
                  const amountPrefix = isNegative ? '' : '+';
                  const label = EVENT_LABELS[row.event_type] ?? row.event_type;
                  const featureLabel = row.action_type
                    ? (ACTION_LABELS[row.action_type] ?? row.action_type)
                    : null;

                  return (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{label}</td>
                      <td className="px-4 py-3 text-on-surface-variant text-sm">
                        {featureLabel ?? <span className="text-outline">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap ${amountClass}`}>
                        {amountPrefix}{row.amount_credits.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface whitespace-nowrap">
                        {row.balance_after_credits.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-on-surface-variant">
              <span>
                Trang {pagination.page}/{pagination.totalPages} · Tổng {pagination.total} giao dịch
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 rounded-lg border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low transition-colors"
                >
                  ← Trước
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 rounded-lg border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low transition-colors"
                >
                  Tiếp →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
