import React, { useEffect, useMemo, useState } from 'react';
import type { MeetingInfo, MeetingParticipant, MeetingParticipantRole } from '../types';
import { saveMeetingInfoDraft } from '../storage';
import { EmailRecipientsInput } from './EmailRecipientsInput';

type Props = {
  initialValue: MeetingInfo;
  onChange: (next: MeetingInfo) => void;
  onContinue: () => void;
  onSkip: () => void;
};

const ROLE_OPTIONS: MeetingParticipantRole[] = ['Chủ trì', 'Thư ký', 'Tham dự', 'Khách', 'Khác'];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function normalize(info: MeetingInfo): MeetingInfo {
  return {
    companyName: info.companyName ?? '',
    companyAddress: info.companyAddress ?? '',
    meetingDatetime: info.meetingDatetime ?? '',
    meetingLocation: info.meetingLocation ?? '',
    participants: Array.isArray(info.participants) ? info.participants : [],
    recipientEmails: Array.isArray(info.recipientEmails) ? info.recipientEmails : [],
  };
}

export function MeetingInfoForm(props: Props) {
  const [value, setValue] = useState<MeetingInfo>(() => normalize(props.initialValue));

  useEffect(() => {
    setValue(normalize(props.initialValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const participantsCount = useMemo(() => value.participants.filter(p => p.name.trim().length > 0).length, [value.participants]);

  useEffect(() => {
    props.onChange(value);
    saveMeetingInfoDraft(value);
  }, [value]);

  const updateField = (key: keyof MeetingInfo, next: string) => {
    setValue(prev => ({ ...prev, [key]: next }));
  };

  const addParticipant = () => {
    const p: MeetingParticipant = { id: createId(), name: '', title: '', role: 'Tham dự' };
    setValue(prev => ({ ...prev, participants: [...prev.participants, p] }));
  };

  const updateParticipant = (id: string, patch: Partial<MeetingParticipant>) => {
    setValue(prev => ({
      ...prev,
      participants: prev.participants.map(p => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const removeParticipant = (id: string) => {
    setValue(prev => ({ ...prev, participants: prev.participants.filter(p => p.id !== id) }));
  };

  return (
    <div className="bg-white border-slate-200 shadow-sm rounded-xl p-6 space-y-6 border">
      <div className="space-y-1">
        <h3 className="text-xl font-sans font-medium text-slate-800">Thông tin cuộc họp</h3>
        <p className="text-sm font-medium text-slate-500">
          Nhập nhanh vài thông tin để biên bản chính xác hơn (có thể bỏ qua).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-800">Tên doanh nghiệp</label>
          <input
            value={value.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            className="w-full px-4 py-3 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
            placeholder="VD: Công ty ABC"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-800">Địa chỉ doanh nghiệp</label>
          <input
            value={value.companyAddress}
            onChange={(e) => updateField('companyAddress', e.target.value)}
            className="w-full px-4 py-3 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
            placeholder="VD: 123 Nguyễn Trãi, Q.1"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-800">Thời gian</label>
          <input
            value={value.meetingDatetime}
            onChange={(e) => updateField('meetingDatetime', e.target.value)}
            className="w-full px-4 py-3 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
            placeholder="VD: 09:00 11/03/2026"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-800">Địa điểm</label>
          <input
            value={value.meetingLocation}
            onChange={(e) => updateField('meetingLocation', e.target.value)}
            className="w-full px-4 py-3 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
            placeholder="VD: Online - Google Meet / Văn phòng..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-slate-800">Thành phần tham dự</p>
            <p className="text-xs font-medium text-slate-500">Gợi ý: nhập tên + chức danh + vai trò (Chủ trì/Thư ký/Tham dự).</p>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="px-4 py-2 border-slate-200 bg-white text-slate-800 text-sm font-medium shadow-sm rounded-xl hover:bg-slate-50 transition-all border"
          >
            + Thêm người
          </button>
        </div>

        {value.participants.length === 0 ? (
          <div className="border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-400 text-center rounded-2xl">
            Chưa có người tham dự. Bạn có thể bấm “Thêm người”, hoặc bỏ qua bước này.
          </div>
        ) : (
          <div className="space-y-3">
            {value.participants.map((p, idx) => (
              <div key={p.id} className="border-slate-200 bg-slate-50 p-4 transition-colors focus-within:border-slate-200 focus-within:bg-white border rounded-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">Người {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 border-red-600 shadow-sm rounded-xl transition-all"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Tên</label>
                    <input
                      value={p.name}
                      onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Chức danh</label>
                    <input
                      value={p.title ?? ''}
                      onChange={(e) => updateParticipant(p.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors border rounded-xl"
                      placeholder="VD: Giám đốc / PM"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Vai trò</label>
                    <select
                      value={p.role ?? 'Tham dự'}
                      onChange={(e) => updateParticipant(p.id, { role: e.target.value as MeetingParticipantRole })}
                      className="w-full px-3 py-2 border-slate-200 focus:border-slate-200 bg-white focus:outline-none text-sm font-medium transition-colors appearance-none cursor-pointer border rounded-xl"
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email recipients */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500">
          Nhập danh sách email nhận biên bản. Tối đa 20 địa chỉ.
        </p>
        <EmailRecipientsInput
          value={value.recipientEmails}
          onChange={(emails) => setValue(prev => ({ ...prev, recipientEmails: emails }))}
        />
      </div>

      <div className="flex gap-4 justify-end flex-wrap pt-4">
        <button
          type="button"
          onClick={props.onSkip}
          className="px-6 py-3 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-200 transition-colors border rounded-xl"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={props.onContinue}
          className="px-6 py-3 bg-indigo-600 text-white font-sans font-medium border-slate-200 shadow-sm rounded-xl hover:bg-indigo-700 transition-all active:bg-indigo-800 border"
        >
          Tiếp tục tạo biên bản ({participantsCount} người)
        </button>
      </div>
    </div>
  );
}

