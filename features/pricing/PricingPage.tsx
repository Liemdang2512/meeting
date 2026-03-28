import React, { useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface Plan {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  price: string;
  unit: string;
  features: string[];
  cta: string;
  ctaAction: 'current' | 'upgrade' | 'contact';
  highlight?: boolean;
  accent: 'amber' | 'blue' | 'green';
}

const PLANS: Plan[] = [
  {
    id: 'reporter',
    name: 'Phóng viên',
    subtitle: 'BÁO CHÍ',
    icon: '📰',
    price: '399.000',
    unit: '₫ / tháng',
    features: [
      'Ghi chép không giới hạn',
      'Phỏng vấn & họp báo tự động',
      'Nhận diện nhiều người nói',
      'Xuất PDF, DOCX, TXT',
      '100+ ngôn ngữ',
    ],
    cta: 'Nâng cấp ngay',
    ctaAction: 'upgrade',
    accent: 'amber',
  },
  {
    id: 'specialist',
    name: 'Chuyên viên',
    subtitle: 'DOANH NGHIỆP',
    icon: '💼',
    price: '299.000',
    unit: '₫ / tháng',
    features: [
      'Ghi chép không giới hạn',
      'Tự động tạo biên bản họp',
      'Tóm tắt & danh sách việc cần làm',
      'Tích hợp lịch & email',
      'Xuất hàng loạt',
    ],
    cta: 'Nâng cấp ngay',
    ctaAction: 'upgrade',
    highlight: true,
    accent: 'blue',
  },
  {
    id: 'officer',
    name: 'Cán bộ',
    subtitle: 'PHÁP LÝ',
    icon: '⚖️',
    price: '499.000',
    unit: '₫ / tháng',
    features: [
      'Ghi chép độ chính xác cao nhất',
      'Nhận diện thuật ngữ pháp lý',
      'Đánh dấu thời gian từng câu',
      'Mã hóa & bảo mật tối đa',
      'Xuất định dạng tòa án',
    ],
    cta: 'Nâng cấp ngay',
    ctaAction: 'upgrade',
    accent: 'green',
  },
];

interface PricingPageProps {
  currentUserRole?: string;
  userWorkflowGroups?: string[];
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentUserRole, userWorkflowGroups }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleCtaClick = (plan: Plan) => {
    if (plan.ctaAction === 'upgrade') {
      setShowUpgradeModal(true);
    } else if (plan.ctaAction === 'contact') {
      window.location.href = 'mailto:contact@meetingassistant.app?subject=Tu%20van%20goi%20dich%20vu';
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    if (plan.id === 'specialist' && currentUserRole === 'pro') return true;
    if (plan.id === 'officer' && (currentUserRole === 'enterprise' || currentUserRole === 'admin')) return true;
    return false;
  };

  const isRegistered = (plan: Plan) => {
    return userWorkflowGroups?.includes(plan.id) ?? false;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-semibold text-slate-900">Bảng giá theo nhóm người dùng</h1>
          <p className="text-slate-500 text-base">Chọn gói phù hợp cho nhu cầu công việc của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PLANS.map(plan => {
            const isCurrent = isCurrentPlan(plan);
            const registered = isRegistered(plan);
            const isBlue = plan.accent === 'blue';
            const checkColorClass = isBlue ? 'text-blue-300' : plan.accent === 'green' ? 'text-emerald-400' : 'text-amber-500';

            return (
              <div
                key={plan.id}
                className={`rounded-[28px] border p-8 space-y-6 flex flex-col relative transition-all ${
                  isBlue
                    ? 'bg-gradient-to-b from-[#08122F] to-[#070E26] border-blue-700 text-white shadow-2xl shadow-blue-950/40'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-[11px] font-semibold px-4 py-1 rounded-full tracking-wide">
                      PHỔ BIẾN NHẤT
                    </span>
                  </div>
                )}
                {registered && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      ✓ Đã đăng ký
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${isBlue ? 'bg-white/10' : 'bg-slate-100'}`}>
                      <span aria-hidden="true">{plan.icon}</span>
                    </div>
                    <div>
                      <h2 className={`text-[2rem] font-bold leading-none ${isBlue ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h2>
                      <p className={`text-xs font-semibold tracking-wide mt-1 ${isBlue ? 'text-blue-300' : plan.accent === 'green' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {plan.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <span className={`text-5xl font-black tracking-tight ${isBlue ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                    <span className={`${isBlue ? 'text-slate-300' : 'text-slate-500'} font-medium pb-2`}>{plan.unit}</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 pt-2">
                  {plan.features.map(feature => (
                    <li key={feature} className={`flex items-start gap-2 text-sm ${isBlue ? 'text-slate-100' : 'text-slate-700'}`}>
                      <span className={`mt-0.5 shrink-0 font-bold ${checkColorClass}`}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCtaClick(plan)}
                  disabled={isCurrent || registered}
                  className={`w-full py-3.5 font-semibold rounded-full transition-colors ${
                    isCurrent || registered
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : isBlue
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40'
                      : plan.accent === 'green'
                      ? 'border border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                      : 'border border-amber-500 text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  {isCurrent ? 'Gói hiện tại' : registered ? 'Đã đăng ký' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Giá chưa bao gồm VAT · Hủy gói bất cứ lúc nào · Cần tư vấn? Liên hệ hỗ trợ
        </p>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};
