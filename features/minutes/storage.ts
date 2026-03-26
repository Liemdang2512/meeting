import type { MeetingInfo, ReporterInfo, OfficerInfo } from './types';

const DRAFT_KEY = 'mom_meeting_info_v1';

export function loadMeetingInfoDraft(): MeetingInfo | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    // Cross-group guard: only accept specialist or legacy (no _type)
    if (parsed._type !== undefined && parsed._type !== 'specialist') return null;
    if (!Array.isArray(parsed.participants)) return null;
    return {
      companyName: (parsed.companyName as string) ?? '',
      companyAddress: (parsed.companyAddress as string) ?? '',
      meetingDatetime: (parsed.meetingDatetime as string) ?? '',
      meetingLocation: (parsed.meetingLocation as string) ?? '',
      participants: parsed.participants as MeetingInfo['participants'],
      recipientEmails: [],
    };
  } catch {
    return null;
  }
}

export function saveMeetingInfoDraft(info: MeetingInfo): void {
  const { recipientEmails: _, ...persistable } = info;
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ _type: 'specialist', ...persistable }));
}

export function clearMeetingInfoDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function clearDraft(): void {
  clearMeetingInfoDraft();
}

export function saveReporterDraft(info: ReporterInfo): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ _type: 'reporter', ...info }));
}

export function loadReporterDraft(): ReporterInfo | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed._type !== 'reporter') return null;
    return {
      interviewTitle: (parsed.interviewTitle as string) ?? '',
      guestName: (parsed.guestName as string) ?? '',
      reporter: (parsed.reporter as string) ?? '',
      datetime: (parsed.datetime as string) ?? '',
      location: (parsed.location as string) ?? '',
    };
  } catch {
    return null;
  }
}

export function saveOfficerDraft(info: OfficerInfo): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ _type: 'officer', ...info }));
}

export function loadOfficerDraft(): OfficerInfo | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed._type !== 'officer') return null;
    return {
      title: (parsed.title as string) ?? '',
      presiding: (parsed.presiding as string) ?? '',
      courtSecretary: (parsed.courtSecretary as string) ?? '',
      participants: (parsed.participants as OfficerInfo['participants']) ?? [],
      datetime: (parsed.datetime as string) ?? '',
      location: (parsed.location as string) ?? '',
    };
  } catch {
    return null;
  }
}
