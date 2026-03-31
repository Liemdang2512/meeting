import React, { useEffect, useMemo, useState } from 'react';
import type { MeetingInfo, MeetingParticipant, MeetingParticipantRole } from '../types';
import { saveMeetingInfoDraft } from '../storage';
import { EmailRecipientsInput } from './EmailRecipientsInput';

type Props = {
  initialValue: MeetingInfo;
  onChange: (next: MeetingInfo) => void;
  onContinue: () => void;
  onSkip: () => void;
  labels?: {
    companyName?: string;
    companyAddress?: string;
  };
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
    <div className="bg-surface-container-lowest border border-outline-variant/20 shadow-sm rounded-2xl p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-headline font-bold text-on-surface">Thông tin cuộc họp</h3>
        <p className="text-sm text-on-surface-variant">
          Nhập nhanh vài thông tin để biên bản chính xác hơn (có thể bỏ qua).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">{props.labels?.companyName ?? 'Tên doanh nghiệp'}</label>
          <input
            value={value.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
            placeholder="VD: Công ty ABC"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">{props.labels?.companyAddress ?? 'Địa chỉ doanh nghiệp'}</label>
          <input
            value={value.companyAddress}
            onChange={(e) => updateField('companyAddress', e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
            placeholder="VD: 123 Nguyễn Trãi, Q.1"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">Thời gian</label>
          <input
            value={value.meetingDatetime}
            onChange={(e) => updateField('meetingDatetime', e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
            placeholder="VD: 09:00 11/03/2026"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">Địa điểm</label>
          <input
            value={value.meetingLocation}
            onChange={(e) => updateField('meetingLocation', e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
            placeholder="VD: Online - Google Meet / Văn phòng..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-on-surface">Thành phần tham dự</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Gợi ý: nhập tên + chức danh + vai trò (Chủ trì/Thư ký/Tham dự).</p>
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="px-4 py-2 bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm font-medium rounded-xl hover:bg-surface-container-high transition-all cursor-pointer"
          >
            + Thêm người
          </button>
        </div>

        {value.participants.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant/30 bg-surface-container-low/50 p-5 text-sm text-on-surface-variant text-center rounded-2xl">
            Chưa có người tham dự. Bạn có thể bấm "Thêm người", hoặc bỏ qua bước này.
          </div>
        ) : (
          <div className="space-y-3">
            {value.participants.map((p, idx) => (
              <div key={p.id} className="bg-surface-container-low border border-outline-variant/15 p-4 rounded-2xl transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-on-surface">Người {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.id)}
                    className="text-xs font-medium text-white bg-error hover:bg-error/90 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">Tên</label>
                    <input
                      value={p.name}
                      onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">Chức danh</label>
                    <input
                      value={p.title ?? ''}
                      onChange={(e) => updateParticipant(p.id, { title: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 transition-colors rounded-xl"
                      placeholder="VD: Giám đốc / PM"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">Vai trò</label>
                    <select
                      value={p.role ?? 'Tham dự'}
                      onChange={(e) => updateParticipant(p.id, { role: e.target.value as MeetingParticipantRole })}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium text-on-surface transition-colors appearance-none cursor-pointer rounded-xl"
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
      <div className="space-y-1.5">
        <p className="text-xs text-on-surface-variant">
          Nhập danh sách email nhận biên bản. Tối đa 20 địa chỉ.
        </p>
        <EmailRecipientsInput
          value={value.recipientEmails}
          onChange={(emails) => setValue(prev => ({ ...prev, recipientEmails: emails }))}
        />
      </div>

      <div className="flex gap-4 justify-end flex-wrap pt-4 border-t border-outline-variant/10">
        <button
          type="button"
          onClick={props.onSkip}
          className="px-6 py-3 border border-outline-variant/20 text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors rounded-xl cursor-pointer"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={props.onContinue}
          className="px-6 py-3 nebula-gradient text-white font-bold shadow-lg shadow-primary/20 rounded-xl hover:brightness-110 transition-all active:scale-95 cursor-pointer"
        >
          Tiếp tục tạo biên bản ({participantsCount} người)
        </button>
      </div>
    </div>
  );
}

