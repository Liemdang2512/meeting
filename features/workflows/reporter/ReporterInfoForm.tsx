import React, { useEffect } from 'react';
import type { ReporterInfo } from '../../minutes/types';
import { saveReporterDraft } from '../../minutes/storage';

type Props = {
  value: ReporterInfo;
  onChange: (next: ReporterInfo) => void;
  onContinue: () => void;
  onSkip: () => void;
};

const INPUT_CLASS =
  'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white';

const LABEL_CLASS = 'block text-sm font-semibold text-slate-800 mb-1';

export function ReporterInfoForm({ value, onChange, onContinue, onSkip }: Props) {
  useEffect(() => {
    saveReporterDraft(value);
  }, [value]);

  const updateField = (key: keyof ReporterInfo, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-slate-800">Thông tin phỏng vấn</h3>
        <p className="text-sm text-slate-500">
          Nhập thông tin bài phỏng vấn để tạo nội dung chính xác hơn (có thể bỏ qua).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* interviewTitle — full width */}
        <div className="md:col-span-2 space-y-1">
          <label className={LABEL_CLASS}>Tiêu đề phỏng vấn</label>
          <input
            type="text"
            value={value.interviewTitle}
            onChange={(e) => updateField('interviewTitle', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Phỏng vấn CEO công ty ABC"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Tên khách mời</label>
          <input
            type="text"
            value={value.guestName}
            onChange={(e) => updateField('guestName', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Nguyễn Văn A"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Phóng viên</label>
          <input
            type="text"
            value={value.reporter}
            onChange={(e) => updateField('reporter', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Trần Thị B"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Thời gian</label>
          <input
            type="datetime-local"
            value={value.datetime}
            onChange={(e) => updateField('datetime', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Địa điểm</label>
          <input
            type="text"
            value={value.location}
            onChange={(e) => updateField('location', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Trụ sở ABC, Quận 1, TP.HCM"
          />
        </div>
      </div>

      <div className="flex gap-4 justify-end flex-wrap pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors duration-200"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1E40AF] transition-colors duration-200 shadow-sm"
        >
          Tiếp tục tạo bài
        </button>
      </div>
    </div>
  );
}
