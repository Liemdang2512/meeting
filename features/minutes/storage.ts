import type { MeetingInfo } from './types';

const DRAFT_KEY = 'mom_meeting_info_v1';

export function loadMeetingInfoDraft(): MeetingInfo | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeetingInfo;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.participants)) return null;
    return {
      companyName: parsed.companyName ?? '',
      companyAddress: parsed.companyAddress ?? '',
      meetingDatetime: parsed.meetingDatetime ?? '',
      meetingLocation: parsed.meetingLocation ?? '',
      participants: parsed.participants,
    };
  } catch {
    return null;
  }
}

export function saveMeetingInfoDraft(info: MeetingInfo): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(info));
}

export function clearMeetingInfoDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

