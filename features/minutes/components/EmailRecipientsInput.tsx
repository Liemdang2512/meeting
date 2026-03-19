import React, { useEffect, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailRecipientsInputProps = {
  value: string[];
  onChange: (emails: string[]) => void;
  maxRecipients?: number;
};

export function EmailRecipientsInput({ value, onChange, maxRecipients = 20 }: EmailRecipientsInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const addTag = (raw: string) => {
    const email = raw.trim().replace(/,+$/, '');
    if (!email) return;

    if (!EMAIL_RE.test(email)) {
      setError(`Email không hợp lệ: ${email}`);
      setInputVal('');
      return;
    }

    if (value.includes(email)) {
      setError('Email này đã có trong danh sách');
      setInputVal('');
      return;
    }

    if (value.length >= maxRecipients) {
      setError(`Đã đạt tối đa ${maxRecipients} địa chỉ email`);
      setInputVal('');
      return;
    }

    setError('');
    onChange([...value, email]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Tab') {
      if (inputVal.trim()) {
        e.preventDefault();
        addTag(inputVal);
      }
    } else if (e.key === 'Backspace') {
      if (inputVal === '' && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) {
      addTag(inputVal);
    }
  };

  const count = value.length;
  const counterClass = count >= maxRecipients
    ? 'text-red-500'
    : count >= 18
    ? 'text-amber-500'
    : 'text-slate-400';

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-800">
          Người nhận email
        </label>
        <span className={`text-xs font-medium ${counterClass}`}>
          {count}/{maxRecipients}
        </span>
      </div>

      {/* Input field */}
      <input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full px-4 py-3 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
        placeholder="Nhập email rồi nhấn Enter hoặc dấu phẩy..."
      />

      {/* Chips cloud */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg"
            >
              {email}
              <button
                type="button"
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="w-4 h-4 text-indigo-400 hover:text-red-500 cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Error row */}
      {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
}
