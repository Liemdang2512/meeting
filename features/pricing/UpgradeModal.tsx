import React, { useState } from 'react';
import { getToken } from '../../lib/api';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState<'vnpay' | 'momo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async (gateway: 'vnpay' | 'momo') => {
    setLoading(gateway);
    setError(null);
    const token = getToken(); // Read from localStorage key 'auth_token'
    try {
      const res = await fetch(`/api/payments/${gateway}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
        setLoading(null);
        return;
      }
      // Full-page redirect to gateway — card data never touches our server
      const url = data.paymentUrl ?? data.payUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Liên kết thanh toán không hợp lệ.');
        setLoading(null);
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Chọn phương thức thanh toán</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Nâng cấp tài khoản — <span className="font-semibold text-gray-700">99.000 VND</span> / một lần
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* VNPay — covers Visa, Mastercard, domestic ATM, VNPay QR */}
          <button
            onClick={() => handlePay('vnpay')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <img src="/styles/VISA-logo.png" alt="Visa" className="h-5 object-contain" />
                <img src="/styles/Mastercard-logo.svg" alt="Mastercard" className="h-6 object-contain" />
                <img src="/styles/Icon-VNPAY-QR.webp" alt="VNPay QR" className="h-6 object-contain ml-1" />
              </div>
              <span className="text-sm font-medium text-gray-700">Visa / Mastercard / VNPay QR</span>
            </div>
            {loading === 'vnpay' ? (
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* MoMo e-wallet */}
          <button
            onClick={() => handlePay('momo')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-3">
              <img src="/styles/Logo-MoMo.webp" alt="MoMo" className="h-8 object-contain" />
              <span className="text-sm font-medium text-gray-700">Ví MoMo</span>
            </div>
            {loading === 'momo' ? (
              <svg className="w-5 h-5 animate-spin text-pink-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400 group-hover:text-pink-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        <p className="mt-5 text-xs text-gray-400 text-center">
          Bạn sẽ được chuyển đến trang thanh toán an toàn. Thông tin thẻ không lưu trên hệ thống.
        </p>
      </div>
    </div>
  );
};
