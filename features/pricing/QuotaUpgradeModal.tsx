import React from 'react';

interface QuotaUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPlans: () => void;
}

export const QuotaUpgradeModal: React.FC<QuotaUpgradeModalProps> = ({
  isOpen,
  onClose,
  onViewPlans,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl text-3xl">
            ⚡
          </div>
          <h2 className="text-2xl font-sans font-medium text-slate-800">
            Đã hết lượt hôm nay
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tài khoản miễn phí giới hạn 1 lần/ngày — bao gồm đầy đủ tải file, ghi chép, thông tin cuộc họp và biên bản.
            Nâng cấp lên Pro để sử dụng không giới hạn.
          </p>
          <p className="text-slate-400 text-xs">
            Quota sẽ được reset lúc 00:00 GMT+7 mỗi ngày.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onViewPlans}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Xem các gói nâng cấp
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
