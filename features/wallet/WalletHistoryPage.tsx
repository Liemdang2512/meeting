import React from 'react';
import { CreditHistory } from '../pricing/CreditHistory';
import { QuotaBadge } from '../pricing/QuotaBadge';

interface Props {
  onBack: () => void;
}

export const WalletHistoryPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-6 text-sm text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
        >
          ← Quay lại
        </button>

        <h1 className="text-2xl font-bold font-headline text-on-surface mb-2">Lịch sử giao dịch</h1>
        <p className="text-sm text-on-surface-variant mb-6">Theo dõi các lần trừ và nạp credit trong tài khoản của bạn.</p>

        {/* Số dư hiện tại */}
        <div className="mb-8 p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-2">Số dư hiện tại</p>
          <QuotaBadge variant="card" />
        </div>

        {/* Bảng lịch sử */}
        <CreditHistory />
      </div>
    </div>
  );
};
