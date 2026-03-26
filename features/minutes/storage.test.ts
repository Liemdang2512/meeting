import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import {
  saveMeetingInfoDraft,
  loadMeetingInfoDraft,
  clearMeetingInfoDraft,
  saveReporterDraft,
  loadReporterDraft,
  saveOfficerDraft,
  loadOfficerDraft,
  clearDraft,
} from './storage';

import type { MeetingInfo, ReporterInfo, OfficerInfo } from './types';

const DRAFT_KEY = 'mom_meeting_info_v1';

const sampleMeetingInfo: MeetingInfo = {
  companyName: 'Acme Corp',
  companyAddress: '123 Main St',
  meetingDatetime: '2026-01-01T10:00',
  meetingLocation: 'Hanoi',
  participants: [{ id: '1', name: 'Alice', title: 'Manager', role: 'Chủ trì' }],
  recipientEmails: ['alice@example.com'],
};

const sampleReporterInfo: ReporterInfo = {
  interviewTitle: 'Phỏng vấn về AI',
  guestName: 'Nguyễn Văn A',
  reporter: 'Trần Thị B',
  datetime: '2026-01-01T09:00',
  location: 'Hà Nội',
};

const sampleOfficerInfo: OfficerInfo = {
  title: 'Vụ kiện ABC',
  presiding: 'Thẩm phán X',
  courtSecretary: 'Thư ký Y',
  participants: [{ id: '2', name: 'Bob', title: 'Luật sư', role: 'Tham dự' }],
  datetime: '2026-01-01T14:00',
  location: 'Tòa án Hà Nội',
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('saveMeetingInfoDraft', () => {
  it('does NOT persist recipientEmails to localStorage', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.recipientEmails).toBeUndefined();
  });

  it('persists all other MeetingInfo fields to localStorage', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.companyName).toBe('Acme Corp');
    expect(parsed.companyAddress).toBe('123 Main St');
    expect(parsed.meetingDatetime).toBe('2026-01-01T10:00');
    expect(parsed.meetingLocation).toBe('Hanoi');
    expect(parsed.participants).toHaveLength(1);
  });

  it('writes _type = specialist', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed._type).toBe('specialist');
  });
});

describe('loadMeetingInfoDraft', () => {
  it('returns recipientEmails as empty array', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const result = loadMeetingInfoDraft();
    expect(result).not.toBeNull();
    expect(result!.recipientEmails).toEqual([]);
  });

  it('returns MeetingInfo when _type is specialist', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const result = loadMeetingInfoDraft();
    expect(result).not.toBeNull();
    expect(result!.companyName).toBe('Acme Corp');
  });

  it('returns MeetingInfo for legacy data without _type (backward compat)', () => {
    // Write legacy data (no _type)
    const legacy = {
      companyName: 'Legacy Corp',
      companyAddress: 'Old St',
      meetingDatetime: '2025-01-01',
      meetingLocation: 'HCMC',
      participants: [],
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(legacy));
    const result = loadMeetingInfoDraft();
    expect(result).not.toBeNull();
    expect(result!.companyName).toBe('Legacy Corp');
  });

  it('returns null when _type is reporter (cross-group guard)', () => {
    saveReporterDraft(sampleReporterInfo);
    const result = loadMeetingInfoDraft();
    expect(result).toBeNull();
  });

  it('returns null when _type is officer (cross-group guard)', () => {
    saveOfficerDraft(sampleOfficerInfo);
    const result = loadMeetingInfoDraft();
    expect(result).toBeNull();
  });

  it('returns null when localStorage is empty', () => {
    const result = loadMeetingInfoDraft();
    expect(result).toBeNull();
  });
});

describe('saveReporterDraft', () => {
  it('writes _type = reporter to localStorage', () => {
    saveReporterDraft(sampleReporterInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed._type).toBe('reporter');
  });

  it('persists all ReporterInfo fields', () => {
    saveReporterDraft(sampleReporterInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.interviewTitle).toBe('Phỏng vấn về AI');
    expect(parsed.guestName).toBe('Nguyễn Văn A');
    expect(parsed.reporter).toBe('Trần Thị B');
    expect(parsed.datetime).toBe('2026-01-01T09:00');
    expect(parsed.location).toBe('Hà Nội');
  });
});

describe('loadReporterDraft', () => {
  it('returns ReporterInfo when _type is reporter', () => {
    saveReporterDraft(sampleReporterInfo);
    const result = loadReporterDraft();
    expect(result).not.toBeNull();
    expect(result!.interviewTitle).toBe('Phỏng vấn về AI');
    expect(result!.guestName).toBe('Nguyễn Văn A');
  });

  it('returns null when _type is specialist (cross-group guard)', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const result = loadReporterDraft();
    expect(result).toBeNull();
  });

  it('returns null when _type is officer (cross-group guard)', () => {
    saveOfficerDraft(sampleOfficerInfo);
    const result = loadReporterDraft();
    expect(result).toBeNull();
  });

  it('returns null when localStorage is empty', () => {
    const result = loadReporterDraft();
    expect(result).toBeNull();
  });
});

describe('saveOfficerDraft', () => {
  it('writes _type = officer to localStorage', () => {
    saveOfficerDraft(sampleOfficerInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed._type).toBe('officer');
  });

  it('persists all OfficerInfo fields', () => {
    saveOfficerDraft(sampleOfficerInfo);
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.title).toBe('Vụ kiện ABC');
    expect(parsed.presiding).toBe('Thẩm phán X');
    expect(parsed.courtSecretary).toBe('Thư ký Y');
    expect(parsed.participants).toHaveLength(1);
    expect(parsed.datetime).toBe('2026-01-01T14:00');
    expect(parsed.location).toBe('Tòa án Hà Nội');
  });
});

describe('loadOfficerDraft', () => {
  it('returns OfficerInfo when _type is officer', () => {
    saveOfficerDraft(sampleOfficerInfo);
    const result = loadOfficerDraft();
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Vụ kiện ABC');
    expect(result!.presiding).toBe('Thẩm phán X');
    expect(result!.courtSecretary).toBe('Thư ký Y');
  });

  it('returns null when _type is specialist (cross-group guard)', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    const result = loadOfficerDraft();
    expect(result).toBeNull();
  });

  it('returns null when _type is reporter (cross-group guard)', () => {
    saveReporterDraft(sampleReporterInfo);
    const result = loadOfficerDraft();
    expect(result).toBeNull();
  });

  it('returns null when localStorage is empty', () => {
    const result = loadOfficerDraft();
    expect(result).toBeNull();
  });
});

describe('clearMeetingInfoDraft / clearDraft', () => {
  it('removes item from localStorage', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    clearMeetingInfoDraft();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('clearDraft is alias for clearMeetingInfoDraft', () => {
    saveMeetingInfoDraft(sampleMeetingInfo);
    clearDraft();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
