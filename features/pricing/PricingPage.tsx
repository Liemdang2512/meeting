import React, { useEffect, useState } from 'react';
import { Check, Shield, Lock } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';
import { authFetch } from '../../lib/api';

interface Plan {
  id: 'reporter' | 'specialist' | 'officer';
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
    subtitle: 'Báo chí',
    icon: 'news',
    price: '399.000',
    unit: '₫/tháng',
    features: [
      'Ghi chép không giới hạn',
      'Phỏng vấn & họp báo tự động',
      'Nhận diện nhiều người nói',
      'Xuất PDF, DOCX, TXT',
      '100+ ngôn ngữ',
    ],
    cta: 'Đăng ký ngay',
    ctaAction: 'upgrade',
    accent: 'amber',
  },
  {
    id: 'specialist',
    name: 'Chuyên viên',
    subtitle: 'Doanh nghiệp',
    icon: 'work',
    price: '299.000',
    unit: '₫/tháng',
    features: [
      'Ghi chép không giới hạn',
      'Tự động tạo biên bản họp',
      'Tóm tắt & danh sách việc cần làm',
      'Tích hợp lịch & email',
      'Xuất hàng loạt',
    ],
    cta: 'Đăng ký ngay',
    ctaAction: 'upgrade',
    highlight: true,
    accent: 'blue',
  },
  {
    id: 'officer',
    name: 'Cán bộ',
    subtitle: 'Pháp lý',
    icon: 'gavel',
    price: '499.000',
    unit: '₫/tháng',
    features: [
      'Ghi chép độ chính xác cao nhất',
      'Nhận diện thuật ngữ pháp lý',
      'Đánh dấu thời gian từng câu',
      'Mã hóa & bảo mật tối đa',
      'Xuất định dạng tòa án',
    ],
    cta: 'Đăng ký ngay',
    ctaAction: 'upgrade',
    accent: 'green',
  },
];

interface PricingPageProps {
  currentUserRole?: string;
  userPlans?: string[];
  onPaymentSuccess?: () => Promise<void> | void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentUserRole, userPlans, onPaymentSuccess }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; overdraftLimit: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const res = await authFetch('/payments/check-upgrade', { method: 'POST' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setWallet({
          balance: Number(data?.wallet?.balance ?? data?.balance ?? 0),
          overdraftLimit: Number(data?.wallet?.overdraftLimit ?? data?.overdraftLimit ?? -10000),
        });
      } catch {
        // Ignore wallet load errors on pricing page to keep purchase flow available.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCtaClick = (plan: Plan) => {
    if (plan.ctaAction === 'upgrade') {
      setSelectedPlan(plan);
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
    return userPlans?.includes(plan.id) ?? false;
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface mb-6 tracking-tight">
            Chọn gói giải pháp{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Phù hợp
            </span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed">
            Tối ưu hóa quy trình ghi chép và tóm tắt cuộc họp với sức mạnh AI của MOMAI. Chọn gói dịch vụ được thiết kế riêng cho nhu cầu của bạn.
          </p>
        </div>

        {wallet && (
          <div className="mb-10 bg-surface-container-low rounded-xl border border-outline-variant/20 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">Số dư hiện tại</p>
              <p className="text-xs text-on-surface-variant">
                Giới hạn âm tối đa: {wallet.overdraftLimit.toLocaleString('vi-VN')} credits
              </p>
            </div>
            <p className="text-xl font-bold text-primary">
              {wallet.balance.toLocaleString('vi-VN')} credits
            </p>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">

          {PLANS.map((plan) => {
            const isCurrent = isCurrentPlan(plan);
            const registered = isRegistered(plan);
            const isHighlight = plan.highlight;
            const isSecondary = plan.accent === 'green';

            if (isHighlight) {
              // Featured card (dark / "Phổ biến nhất")
              return (
                <div
                  key={plan.id}
                  className="relative bg-inverse-surface text-on-primary rounded-xl p-8 shadow-2xl flex flex-col z-10 md:scale-105 border-2 border-primary"
                  style={{ height: '105%' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold tracking-widest px-4 py-1 rounded-full uppercase">
                    Phổ biến nhất
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-xl text-white">{plan.name}</h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">{plan.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1 text-white">
                      <span className="text-4xl font-extrabold font-headline">{plan.price}</span>
                      <span className="text-white/60 font-medium text-sm">{plan.unit}</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="text-primary-fixed w-4 h-4 mt-0.5 shrink-0" />
                        <span className="text-sm text-on-primary/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCtaClick(plan)}
                    disabled={isCurrent || registered}
                    className={`w-full py-4 px-6 rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] ${
                      isCurrent || registered
                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                    }`}
                  >
                    {isCurrent ? 'Gói hiện tại' : registered ? 'Đã đăng ký' : plan.cta}
                  </button>
                </div>
              );
            }

            // Standard cards
            const checkColor = isSecondary ? 'text-secondary' : 'text-primary';
            const borderColor = isSecondary ? 'border-secondary' : 'border-primary';
            const ctaTextColor = isSecondary ? 'text-secondary' : 'text-primary';
            const ctaHover = isSecondary ? 'hover:bg-secondary/5' : 'hover:bg-primary/5';
            const iconBg = isSecondary ? 'bg-secondary-container/20' : 'bg-primary-container/20';
            const iconColor = isSecondary ? 'text-secondary' : 'text-primary';

            return (
              <div
                key={plan.id}
                className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10 flex flex-col h-full transform hover:-translate-y-1 transition-transform duration-300 relative"
              >
                {registered && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      <Check className="w-3 h-3" /> Đã đăng ký
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                      {plan.id === 'reporter' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-xl text-on-surface">{plan.name}</h3>
                      <p className={`text-xs font-bold uppercase tracking-wider ${plan.id === 'reporter' ? 'text-amber-500' : 'text-green-600'}`}>{plan.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-headline">{plan.price}</span>
                    <span className="text-on-surface-variant font-medium text-sm">{plan.unit}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className={`${checkColor} w-4 h-4 mt-0.5 shrink-0`} />
                      <span className="text-sm text-on-surface-variant">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCtaClick(plan)}
                  disabled={isCurrent || registered}
                  className={`w-full py-4 px-6 rounded-full border-2 font-bold transition-colors active:scale-95 ${
                    isCurrent || registered
                      ? 'bg-surface-container-low text-on-surface-variant border-outline-variant cursor-not-allowed'
                      : `${borderColor} ${ctaTextColor} ${ctaHover}`
                  }`}
                >
                  {isCurrent ? 'Gói hiện tại' : registered ? 'Đã đăng ký' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-center">
            <h2 className="font-headline font-bold text-2xl text-on-surface mb-4">Cam kết bảo mật tuyệt đối</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Dữ liệu của bạn được xử lý bằng các mô hình AI riêng tư, không bao giờ được sử dụng để huấn luyện mô hình công cộng. Chúng tôi tuân thủ các tiêu chuẩn bảo mật quốc tế khắt khe nhất.
            </p>
            <div className="flex gap-4 mt-6">
              <div className="flex items-center gap-2">
                <Shield className="text-primary w-5 h-5 fill-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">ISO 27001</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-primary w-5 h-5 fill-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">AES-256</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl min-h-[300px] bg-surface-container-highest flex items-end">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/30" />
            <div className="relative z-10 p-8">
              <p className="text-on-surface font-medium italic">
                "MoMai AI đã giúp đội ngũ pháp lý của chúng tôi tiết kiệm hơn 15 giờ ghi chép mỗi tuần."
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-12">
          Giá chưa bao gồm VAT · Hủy gói bất cứ lúc nào · Cần tư vấn? Liên hệ hỗ trợ
        </p>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onPaymentSuccess={onPaymentSuccess}
        planId={selectedPlan?.id}
        planName={selectedPlan?.name}
        planPrice={selectedPlan?.price}
        planSubtitle="Thanh toán định kỳ hàng tháng"
      />
    </div>
  );
};
