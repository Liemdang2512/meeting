import React, { useEffect } from 'react';
import type { OfficerInfo, MeetingParticipant, MeetingParticipantRole } from '../../minutes/types';
import { saveOfficerDraft } from '../../minutes/storage';

type Props = {
  value: OfficerInfo;
  onChange: (next: OfficerInfo) => void;
  onContinue: () => void;
  onSkip: () => void;
};

const INPUT_CLASS =
  'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white';

const LABEL_CLASS = 'block text-sm font-semibold text-slate-800 mb-1';

const ROLE_OPTIONS: MeetingParticipantRole[] = ['Chủ trì', 'Thư ký', 'Tham dự', 'Khách', 'Khác'];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function OfficerInfoForm({ value, onChange, onContinue, onSkip }: Props) {
  useEffect(() => {
    saveOfficerDraft(value);
  }, [value]);

  const updateField = (key: keyof Omit<OfficerInfo, 'participants'>, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const addParticipant = () => {
    const p: MeetingParticipant = { id: createId(), name: '', title: '', role: 'Tham dự' };
    onChange({ ...value, participants: [...value.participants, p] });
  };

  const updateParticipant = (id: string, patch: Partial<MeetingParticipant>) => {
    onChange({
      ...value,
      participants: value.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const removeParticipant = (id: string) => {
    onChange({ ...value, participants: value.participants.filter((p) => p.id !== id) });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-slate-800">Thông tin vụ án</h3>
        <p className="text-sm text-slate-500">
          Nhập thông tin hồ sơ pháp lý để ghi chép chính xác hơn (có thể bỏ qua).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* title — full width */}
        <div className="md:col-span-2 space-y-1">
          <label className={LABEL_CLASS}>Tiêu đề</label>
          <input
            type="text"
            value={value.title}
            onChange={(e) => updateField('title', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Biên bản phiên tòa dân sự số 001/2026"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Chủ Toạ</label>
          <input
            type="text"
            value={value.presiding}
            onChange={(e) => updateField('presiding', e.target.value)}
            className={INPUT_CLASS}
            placeholder="VD: Thẩm phán Nguyễn Văn A"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL_CLASS}>Thư ký toà</label>
          <input
            type="text"
            value={value.courtSecretary}
            onChange={(e) => updateField('courtSecretary', e.target.value)}
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
            placeholder="VD: Toà án nhân dân Quận 1, TP.HCM"
          />
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-800">Nhân sự</p>
            <p className="text-xs text-slate-500">Gợi ý: nhập tên + chức danh + vai trò.</p>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="px-4 py-2 border border-slate-200 bg-white text-slate-800 text-sm font-semibold shadow-sm rounded-xl hover:bg-slate-50 transition-all"
          >
            + Thêm người
          </button>
        </div>

        {value.participants.length === 0 ? (
          <div className="border-dashed border border-slate-200 bg-slate-50 p-4 text-sm text-slate-400 text-center rounded-2xl">
            Chưa có nhân sự. Bạn có thể bấm "Thêm người", hoặc bỏ qua bước này.
          </div>
        ) : (
          <div className="space-y-3">
            {value.participants.map((p, idx) => (
              <div
                key={p.id}
                className="border border-slate-200 bg-slate-50 p-4 transition-colors focus-within:bg-white rounded-2xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">Người {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-all"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Tên</label>
                    <input
                      value={p.name}
                      onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Chức danh</label>
                    <input
                      value={p.title ?? ''}
                      onChange={(e) => updateParticipant(p.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white"
                      placeholder="VD: Thẩm phán / Luật sư"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Vai trò</label>
                    <select
                      value={p.role ?? 'Tham dự'}
                      onChange={(e) =>
                        updateParticipant(p.id, { role: e.target.value as MeetingParticipantRole })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] bg-white appearance-none cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          Tiếp tục tạo hồ sơ
        </button>
      </div>
    </div>
  );
}
