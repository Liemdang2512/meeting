import { describe, it, expect } from 'vitest';
import { buildReporterPrompt } from './reporterPrompt';
import type { ReporterInfo } from '../../../features/minutes/types';

const sampleInfo: ReporterInfo = {
  interviewTitle: 'Phỏng vấn chuyên gia AI',
  guestName: 'Nguyễn Văn A',
  reporter: 'Trần Thị B',
  datetime: '2026-01-01T09:00',
  location: 'Hà Nội',
};

const templatePrompt = 'Hãy tóm tắt nội dung phỏng vấn này.';

describe('buildReporterPrompt', () => {
  it('returns string containing BÀI PHỎNG VẤN/BÁO CHÍ', () => {
    const result = buildReporterPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('BÀI PHỎNG VẤN/BÁO CHÍ');
  });

  it('contains JSON block with interviewTitle field', () => {
    const result = buildReporterPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"interviewTitle"');
    expect(result).toContain('Phỏng vấn chuyên gia AI');
  });

  it('contains JSON block with guestName field', () => {
    const result = buildReporterPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"guestName"');
    expect(result).toContain('Nguyễn Văn A');
  });

  it('contains JSON block with reporter field', () => {
    const result = buildReporterPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"reporter"');
    expect(result).toContain('Trần Thị B');
  });

  it('contains the templatePrompt text verbatim at the end', () => {
    const result = buildReporterPrompt({ info: sampleInfo, templatePrompt });
    expect(result.endsWith(templatePrompt)).toBe(true);
  });

  it('handles empty fields by setting them to null in JSON', () => {
    const emptyInfo: ReporterInfo = {
      interviewTitle: '',
      guestName: '',
      reporter: '',
      datetime: '',
      location: '',
    };
    const result = buildReporterPrompt({ info: emptyInfo, templatePrompt });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.interviewTitle).toBeNull();
    expect(parsed.guestName).toBeNull();
    expect(parsed.reporter).toBeNull();
  });
});
