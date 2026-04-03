import React, { useEffect, useState } from 'react';
import { getToken, setToken } from '../lib/api';

interface PaymentResultPageProps {
  onTokenRefresh: (newUser: any) => void;
}

export function PaymentResultPage({ onTokenRefresh }: PaymentResultPageProps) {
  const token = getToken(); // Read from localStorage 'auth_token' key
  const params = new URLSearchParams(window.location.search);
  // VNPay return URL sets ?status=success|failed
  // MoMo return URL sets ?resultCode=0 (success) or non-zero (fail)
  // Fallback: check both
  const statusParam = params.get('status');
  const momoResultCode = params.get('resultCode');

  let isSuccess: boolean;
  if (statusParam) {
    isSuccess = statusParam === 'success';
  } else if (momoResultCode !== null) {
    isSuccess = momoResultCode === '0';
  } else {
    isSuccess = false;
  }

  const [upgradeState, setUpgradeState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!isSuccess || !token) return;

    // Call check-upgrade to get a fresh JWT reflecting the new role
    setUpgradeState('loading');
    fetch('/api/payments/check-upgrade', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('check-upgrade failed');
        const data = await res.json();
        // Update token in localStorage using setToken (key = 'auth_token') and parent app state
        if (data.token) {
          setToken(data.token); // Uses localStorage key 'auth_token' — do NOT use localStorage.setItem('token')
        }
        onTokenRefresh(data.user);
        setUpgradeState('done');
      })
      .catch((err) => {
        console.error('[PaymentResultPage] check-upgrade error:', err);
        setUpgradeState('error');
      });
  }, [isSuccess, token]);

  // Auto-redirect to home after 5 seconds on success
  useEffect(() => {
    if (upgradeState !== 'done') return;
    const t = setTimeout(() => {
      window.location.href = '/';
    }, 5000);
    return () => clearTimeout(t);
  }, [upgradeState]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
          {upgradeState === 'loading' && (
            <div className="mb-6">
              <svg className="w-12 h-12 animate-spin text-green-500 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
          {(upgradeState === 'done' || upgradeState === 'idle') && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
          <p className="text-gray-500 mb-6">
            {upgradeState === 'done'
              ? 'Tài khoản của bạn đã được nâng cấp. Tự động chuyển hướng sau 5 giây...'
              : 'Đang kích hoạt tài khoản...'}
          </p>
          {upgradeState === 'error' && (
            <p className="text-amber-600 text-sm mb-4">
              Thanh toán thành công nhưng chưa cập nhật được tài khoản. Vui lòng đăng xuất và đăng nhập lại.
            </p>
          )}
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Về trang chính
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h1>
        <p className="text-gray-500 mb-6">
          Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => (window.location.href = '/pricing')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Xem gói dịch vụ
          </button>
        </div>
      </div>
    </div>
  );
}
