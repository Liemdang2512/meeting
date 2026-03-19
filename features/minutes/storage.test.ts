import { describe, it, expect } from 'vitest';

describe('storage', () => {
  describe('saveMeetingInfoDraft', () => {
    it('does NOT persist recipientEmails to localStorage', () => {
      // TODO: implement when storage.ts is updated with recipientEmails exclusion
      expect(true).toBe(false);
    });

    it('persists all other MeetingInfo fields to localStorage', () => {
      expect(true).toBe(false);
    });
  });

  describe('loadMeetingInfoDraft', () => {
    it('returns recipientEmails as empty array', () => {
      expect(true).toBe(false);
    });
  });
});
