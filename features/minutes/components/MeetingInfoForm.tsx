import React, { useEffect, useMemo, useState } from 'react';
import type { MeetingInfo, MeetingParticipant, MeetingParticipantRole } from '../types';
import { saveMeetingInfoDraft } from '../storage';

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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-800">Thông tin cuộc họp</h3>
        <p className="text-sm text-slate-500">
          Nhập nhanh vài thông tin để biên bản chính xác hơn (có thể bỏ qua).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700">Tên doanh nghiệp</label>
          <input
            value={value.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            placeholder="VD: Công ty ABC"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700">Địa chỉ doanh nghiệp</label>
          <input
            value={value.companyAddress}
            onChange={(e) => updateField('companyAddress', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            placeholder="VD: 123 Nguyễn Trãi, Q.1"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700">Thời gian</label>
          <input
            value={value.meetingDatetime}
            onChange={(e) => updateField('meetingDatetime', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            placeholder="VD: 09:00 11/03/2026"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700">Địa điểm</label>
          <input
            value={value.meetingLocation}
            onChange={(e) => updateField('meetingLocation', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            placeholder="VD: Online - Google Meet / Văn phòng..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-700">Thành phần tham dự</p>
            <p className="text-xs text-slate-500">Gợi ý: nhập tên + chức danh + vai trò (Chủ trì/Thư ký/Tham dự).</p>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Thêm người
          </button>
        </div>

        {value.participants.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Chưa có người tham dự. Bạn có thể bấm “Thêm người”, hoặc bỏ qua bước này.
          </div>
        ) : (
          <div className="space-y-3">
            {value.participants.map((p, idx) => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">Người {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-800"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Tên</label>
                    <input
                      value={p.name}
                      onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Chức danh</label>
                    <input
                      value={p.title ?? ''}
                      onChange={(e) => updateParticipant(p.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                      placeholder="VD: Giám đốc / PM"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Vai trò</label>
                    <select
                      value={p.role ?? 'Tham dự'}
                      onChange={(e) => updateParticipant(p.id, { role: e.target.value as MeetingParticipantRole })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
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

      <div className="flex gap-3 justify-end flex-wrap pt-2">
        <button
          type="button"
          onClick={props.onSkip}
          className="px-4 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={props.onContinue}
          className="px-5 py-3 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          Tiếp tục tạo biên bản ({participantsCount} người)
        </button>
      </div>
    </div>
  );
}

