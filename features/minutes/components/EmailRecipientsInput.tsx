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
    ? 'text-error'
    : count >= 18
    ? 'text-amber-500'
    : 'text-on-surface-variant/60';

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-on-surface">
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
        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
        placeholder="Nhập email rồi nhấn Enter hoặc dấu phẩy..."
      />

      {/* Chips cloud */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg"
            >
              {email}
              <button
                type="button"
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="w-4 h-4 text-primary/60 hover:text-error cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Error row */}
      {error && <p className="text-xs font-medium text-error mt-1">{error}</p>}
    </div>
  );
}
