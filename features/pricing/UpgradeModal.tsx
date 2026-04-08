import React, { useEffect, useRef, useState } from 'react';
import { getToken } from '../../lib/api';
import { Shield, Lock, CreditCard, Building2, Info, Copy, CheckCircle2, Clock, ChevronDown } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => Promise<void> | void;
  planId?: 'reporter' | 'specialist' | 'officer';
  planName?: string;
  planPrice?: string;
  planSubtitle?: string;
}

type PaymentTab = 'card' | 'ewallet' | 'transfer';
type VnpayChannel = 'intl_card' | 'domestic_bank';
type PaymentGateway = 'vnpay' | 'momo' | 'vietqr';

interface VietQrData {
  orderId: string;
  qrImageUrl: string;
  amount: number;
  accountNo: string;
  accountName: string;
  bankBin: string;
  transferContent: string;
  expiresAt: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  planId = 'specialist',
  planName = 'Chuyên viên (Pro)',
  planPrice = '299.000',
  planSubtitle = 'Thanh toán định kỳ hàng tháng',
}) => {
  const [activeTab, setActiveTab] = useState<PaymentTab>('transfer');
  const [loading, setLoading] = useState<PaymentGateway | null>(null);
  const [gatewayPending, setGatewayPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [qrData, setQrData] = useState<VietQrData | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleGatewayMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; status?: 'success' | 'failed' } | null;
      if (!data || data.type !== 'PAYMENT_RESULT') return;

      setGatewayPending(false);
      setLoading(null);

      if (data.status === 'success') {
        setError(null);
        setNotice('Thanh toán thành công. Đang cập nhật trạng thái tài khoản...');
        await onPaymentSuccess?.();
        setNotice('Đã nâng cấp thành công. Trang sẽ tự cập nhật.');
        onClose();
        return;
      }

      setNotice(null);
      setError('Thanh toán chưa thành công. Vui lòng thử lại.');
    };

    window.addEventListener('message', handleGatewayMessage);
    return () => {
      window.removeEventListener('message', handleGatewayMessage);
    };
  }, [onClose, onPaymentSuccess]);

  // Stop polling and clear QR when modal closes
  useEffect(() => {
    if (isOpen) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setError(null);
    setNotice(null);
    setGatewayPending(false);
    setLoading(null);
    setQrData(null);
    setQrPolling(false);
  }, [isOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (orderId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQrPolling(true);
    const token = getToken();

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/vietqr/${orderId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setQrPolling(false);
          setNotice('Thanh toán thành công! Đang cập nhật tài khoản...');
          await onPaymentSuccess?.();
          onClose();
        }
      } catch {
        // ignore transient errors
      }
    }, 5000);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch { /* ignore */ }
  };

  const handlePay = async (gateway: 'vnpay' | 'momo', channel?: VnpayChannel) => {
    setLoading(gateway);
    setError(null);
    const token = getToken();
    try {
      const res = await fetch(`/api/payments/${gateway}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: gateway === 'vnpay' && channel
          ? JSON.stringify({ channel })
          : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
        setLoading(null);
        return;
      }
      const url = data.paymentUrl ?? data.payUrl;
      if (url) {
        const popup = window.open(
          url,
          'momai-payment',
          'popup=yes,width=520,height=760,menubar=no,toolbar=no,status=no'
        );
        if (popup) {
          setGatewayPending(true);
          setNotice('Cổng thanh toán đã mở ở cửa sổ mới. Hoàn tất xong, hệ thống sẽ tự cập nhật tại trang này.');
          return;
        }
        // Popup blocked by browser: fallback to full-page redirect.
        window.location.href = url;
      } else {
        setError('Liên kết thanh toán không hợp lệ.');
        setLoading(null);
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setLoading(null);
      setGatewayPending(false);
    }
  };

  const handleVietQrCheckout = async () => {
    setLoading('vietqr');
    setError(null);
    setNotice(null);
    const token = getToken();

    try {
      const res = await fetch('/api/payments/vietqr/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Không thể tạo mã QR. Vui lòng thử lại.');
        setLoading(null);
        return;
      }

      setQrData({
        orderId: data.orderId,
        qrImageUrl: data.qrImageUrl,
        amount: data.amount,
        accountNo: data.accountNo,
        accountName: data.accountName,
        bankBin: data.bankBin,
        transferContent: data.transferContent,
        expiresAt: data.expiresAt,
      });
      setLoading(null);
      setNotice('Quét mã QR hoặc chuyển khoản thủ công. Hệ thống tự xác nhận ngay khi nhận được tiền.');
      startPolling(data.orderId);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setLoading(null);
    }
  };

  const handlePayNow = () => {
    if (activeTab === 'ewallet') {
      handlePay('momo');
    } else if (activeTab === 'card') {
      handlePay('vnpay', 'intl_card');
    } else {
      void handleVietQrCheckout();
    }
  };

  const priceNum = parseInt(planPrice.replace(/\./g, ''), 10) || 299000;
  const vatAmount = Math.round(priceNum * 10 / 110);
  const subtotal = priceNum - vatAmount;

  const tabs: { id: PaymentTab; icon: React.ReactNode; label: string }[] = [
    { id: 'transfer', icon: <Building2 className="w-5 h-5" />, label: 'Chuyển khoản' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: '#f0effc' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-xl text-indigo-700">MoMai AI</span>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4" />
          <span>Thanh toán bảo mật</span>
        </div>
        <button
          onClick={onClose}
          className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Đóng"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Hoàn tất đơn hàng của bạn</h1>
        <p className="text-gray-500 mb-8">
          Bạn chỉ còn một bước nữa để trải nghiệm quyền năng từ Digital Curator.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left: Order Summary */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🧾</span>
                <h2 className="font-semibold text-gray-900">Tóm tắt đơn hàng</h2>
              </div>

              <div className="mb-4">
                <p className="font-semibold text-gray-900">Gói {planName}</p>
                <p className="text-sm text-gray-500">{planSubtitle}</p>
                <span className="inline-block mt-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                  AI-Powered Insights
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tạm tính</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Thuế VAT (10%)</span>
                  <span>{vatAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-sm text-indigo-600 font-medium">
                  <span>Mã giảm giá (MOMAI20)</span>
                  <span>-0đ</span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex items-baseline justify-between">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-indigo-700">{planPrice}đ</p>
                  <p className="text-xs text-gray-400">/tháng</p>
                </div>
              </div>

              {/* Security badges */}
              <div className="flex justify-around mt-6 pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">SSL Secure</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">PCI-DSS</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Encrypted</span>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-gray-600 italic leading-relaxed">
                "MoMai AI đã thay đổi hoàn toàn cách chúng tôi quản lý các cuộc họp chiến lược. Bản tóm tắt cực kỳ chính xác và tiết kiệm hàng giờ mỗi tuần."
              </p>
              <p className="text-xs text-gray-400 mt-3 font-medium">— Minh Nguyễn, Tech Lead @ Innova</p>
            </div>

            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest pt-1">
              MOMAI SECURED GATEWAY
            </p>
          </div>

          {/* Right: Payment Methods */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-5">Phương thức thanh toán</h2>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    <span className="text-xs">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Card tab */}
              {activeTab === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Tên trên thẻ</label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      readOnly
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 placeholder-gray-300 focus:outline-none cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Số thẻ</label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      readOnly
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 placeholder-gray-300 focus:outline-none cursor-default"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Ngày hết hạn</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        readOnly
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 placeholder-gray-300 focus:outline-none cursor-default"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">CVV/CVC</label>
                      <input
                        type="text"
                        placeholder="•••"
                        readOnly
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 placeholder-gray-300 focus:outline-none cursor-default"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-600 leading-relaxed">
                      Giao dịch của bạn được mã hóa 256-bit. MoMai AI không bao giờ lưu trữ mã bảo mật CVV của bạn.
                    </p>
                  </div>

                  {/* QR collapsible row */}
                  <div className="mt-2 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📱</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">QR Code & Chuyển khoản</p>
                        <p className="text-xs text-gray-400">VietQR, MoMo, ZaloPay</p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}

              {/* E-wallet tab */}
              {activeTab === 'ewallet' && (
                <div className="flex flex-col items-center py-6 space-y-4">
                  <img
                    src="/styles/Logo-MoMo.webp"
                    alt="MoMo"
                    className="h-16 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    Nhấn <strong>"Thanh toán ngay"</strong> để được chuyển đến ví MoMo và hoàn tất thanh toán an toàn.
                  </p>
                  <div className="flex items-start gap-2.5 bg-pink-50 border border-pink-100 rounded-xl p-3.5 w-full">
                    <Info className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-pink-600 leading-relaxed">
                      Thông tin tài khoản MoMo của bạn không bao giờ được lưu trên hệ thống MoMai AI.
                    </p>
                  </div>
                </div>
              )}

              {/* Transfer tab */}
              {activeTab === 'transfer' && (
                <div className="flex flex-col items-center space-y-4">
                  {!qrData ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-indigo-500" />
                      </div>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        Nhấn <strong>"Tạo mã QR"</strong> để hiển thị mã chuyển khoản ngay tại đây. Hệ thống tự xác nhận sau khi nhận được tiền.
                      </p>
                      <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 w-full">
                        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-600 leading-relaxed">
                          Hỗ trợ tất cả ngân hàng Việt Nam qua VietQR. Xác nhận tức thì sau khi thanh toán.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* QR Code */}
                      <div className="border-2 border-indigo-200 rounded-2xl p-3 bg-white shadow-sm">
                        <img
                          src={qrData.qrImageUrl}
                          alt="Mã QR chuyển khoản"
                          className="w-52 h-52 object-contain"
                        />
                      </div>

                      {/* Bank info */}
                      <div className="w-full space-y-2.5 text-sm">
                        <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2.5">
                          <span className="text-gray-500">Số tài khoản</span>
                          <div className="flex items-center gap-2 font-semibold text-gray-800">
                            {qrData.accountNo}
                            <button
                              onClick={() => copyToClipboard(qrData.accountNo, 'accountNo')}
                              className="text-indigo-400 hover:text-indigo-600"
                              title="Sao chép"
                            >
                              {copiedField === 'accountNo' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2.5">
                          <span className="text-gray-500">Chủ tài khoản</span>
                          <span className="font-semibold text-gray-800 uppercase">{qrData.accountName}</span>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2.5">
                          <span className="text-gray-500">Số tiền</span>
                          <span className="font-bold text-indigo-700">{qrData.amount.toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
                          <span className="text-yellow-700 font-medium">Nội dung CK</span>
                          <div className="flex items-center gap-2 font-bold text-yellow-800">
                            {qrData.transferContent}
                            <button
                              onClick={() => copyToClipboard(qrData.transferContent, 'content')}
                              className="text-yellow-500 hover:text-yellow-700"
                              title="Sao chép"
                            >
                              {copiedField === 'content' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Polling indicator */}
                      {qrPolling && (
                        <div className="flex items-center gap-2 text-xs text-indigo-500">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Đang chờ xác nhận thanh toán...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
              {notice && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                  {notice}
                </div>
              )}
              {gatewayPending && (
                <div className="mt-4 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm">
                  Đang chờ xác nhận từ cổng thanh toán...
                </div>
              )}

              {/* Pay button — hide when QR is shown and polling */}
              {!(activeTab === 'transfer' && qrData) && (
                <button
                  onClick={handlePayNow}
                  disabled={loading !== null || gatewayPending}
                  className="mt-6 w-full py-4 rounded-full font-bold text-base text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : activeTab === 'transfer' ? (
                    'Tạo mã QR →'
                  ) : (
                    'Thanh toán ngay →'
                  )}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                Bằng việc nhấn "Thanh toán ngay", bạn đồng ý với{' '}
                <a href="#" className="text-indigo-500 hover:underline">Điều khoản dịch vụ</a>
                {' '}và{' '}
                <a href="#" className="text-indigo-500 hover:underline">Chính sách bảo mật</a>
                {' '}của MoMai.AI.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 bg-white border-t border-gray-200 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-bold text-indigo-700">MoMai AI</p>
          <p className="text-xs text-gray-400">© 2024 MoMai AI. The Digital Curator.</p>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Chính sách bảo mật</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Điều khoản</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Liên hệ</a>
        </div>
      </footer>
    </div>
  );
};
