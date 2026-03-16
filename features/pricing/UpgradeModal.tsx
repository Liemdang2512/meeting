import React, { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentStep = 'form' | 'processing' | 'success';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<PaymentStep>('form');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    setStep('success');
  };

  const handleClose = () => {
    setStep('form');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    onClose();
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8">
        {step === 'form' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-sans font-medium text-slate-800">Nâng cấp lên Pro</h2>
              <p className="text-slate-500 text-sm">199.000 VND/tháng · Hủy bất cứ lúc nào</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-800">Số thẻ</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800">Ngày hết hạn</label>
                  <input
                    type="text"
                    name="expiry"
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800">CVV</label>
                  <input
                    type="text"
                    name="cvv"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="CVV"
                    maxLength={3}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">Demo · Không có giao dịch thực</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Thanh toán
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div>
              <p className="text-xl font-sans font-medium text-slate-800">Đang xử lý...</p>
              <p className="text-slate-500 text-sm mt-1">Vui lòng không đóng trang</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl text-3xl">
              ✓
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-sans font-medium text-slate-800">Thanh toán thành công!</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tính năng đang phát triển. Chúng tôi sẽ sớm kích hoạt tài khoản Pro của bạn.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
