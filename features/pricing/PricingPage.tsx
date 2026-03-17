import React, { useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface Plan {
  id: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  cta: string;
  ctaAction: 'current' | 'upgrade' | 'contact';
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    unit: 'VND/tháng',
    description: 'Bắt đầu miễn phí, không cần thẻ',
    features: [
      '1 lần/ngày (tải file → ghi chép → biên bản)',
      'Phiên âm cơ bản (Basic)',
      'Tóm tắt nội dung cuộc họp',
      'Xuất văn bản (copy)',
      'Sơ đồ tư duy & checklist',
    ],
    cta: 'Gói hiện tại',
    ctaAction: 'current',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '199.000',
    unit: 'VND/tháng',
    description: 'Dành cho cá nhân và nhóm nhỏ',
    features: [
      'Không giới hạn chuyển đổi',
      'Phiên âm nâng cao (Deep)',
      'Tóm tắt & biên bản chuyên nghiệp',
      'Xuất PDF & DOCX',
      'Sơ đồ tư duy & checklist',
    ],
    cta: 'Nâng cấp ngay',
    ctaAction: 'upgrade',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Liên hệ',
    unit: '',
    description: 'Giải pháp cho doanh nghiệp',
    features: [
      'Tất cả tính năng Pro',
      'Nhiều tài khoản nhóm',
      'Tùy chỉnh theo nhu cầu',
      'Triển khai on-premise',
    ],
    cta: 'Liên hệ',
    ctaAction: 'contact',
  },
];

interface PricingPageProps {
  currentUserRole?: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentUserRole }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleCtaClick = (plan: Plan) => {
    if (plan.ctaAction === 'upgrade') {
      setShowUpgradeModal(true);
    } else if (plan.ctaAction === 'contact') {
      window.location.href = 'mailto:contact@meetingassistant.app?subject=Enterprise%20Plan%20Inquiry';
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    if (plan.id === 'free' && currentUserRole === 'free') return true;
    if (plan.id === 'pro' && currentUserRole === 'user') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-sans font-medium text-slate-800">Chọn gói phù hợp</h1>
          <p className="text-slate-500 text-lg">Bắt đầu miễn phí, nâng cấp khi cần</p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = isCurrentPlan(plan);
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-8 space-y-6 flex flex-col ${
                  plan.highlight
                    ? 'border-indigo-500 shadow-lg shadow-indigo-100 relative'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Phổ biến nhất
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="space-y-2">
                  <h2 className="text-xl font-sans font-medium text-slate-800">{plan.name}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-sans font-medium text-slate-800">{plan.price}</span>
                    {plan.unit && <span className="text-slate-500 text-sm">{plan.unit}</span>}
                  </div>
                  <p className="text-slate-500 text-sm">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleCtaClick(plan)}
                  disabled={plan.ctaAction === 'current' || isCurrent}
                  className={`w-full py-3 font-medium rounded-xl transition-colors ${
                    plan.ctaAction === 'current' || isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : plan.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isCurrent ? 'Gói hiện tại' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Tất cả giá chưa bao gồm VAT · Hủy gói bất cứ lúc nào · Câu hỏi? Liên hệ hỗ trợ
        </p>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};
