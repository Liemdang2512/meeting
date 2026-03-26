import { describe, it, expect } from 'vitest';
import { buildOfficerPrompt } from './officerPrompt';
import type { OfficerInfo } from '../../../features/minutes/types';

const sampleInfo: OfficerInfo = {
  title: 'Vụ kiện ABC',
  presiding: 'Thẩm phán Nguyễn',
  courtSecretary: 'Thư ký Trần',
  participants: [
    { id: '1', name: 'Bị cáo A', title: 'Bị cáo', role: 'Tham dự' },
    { id: '2', name: 'Luật sư B', title: 'Luật sư bào chữa', role: 'Tham dự' },
  ],
  datetime: '2026-01-01T14:00',
  location: 'Tòa án Hà Nội',
};

const templatePrompt = 'Hãy tóm tắt biên bản phiên toà này.';

describe('buildOfficerPrompt', () => {
  it('returns string containing BIÊN BẢN PHIÊN TOÀ or HỒ SƠ PHÁP LÝ', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result.includes('BIÊN BẢN PHIÊN TOÀ') || result.includes('HỒ SƠ PHÁP LÝ')).toBe(true);
  });

  it('contains JSON block with title field', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"title"');
    expect(result).toContain('Vụ kiện ABC');
  });

  it('contains JSON block with presiding field', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"presiding"');
    expect(result).toContain('Thẩm phán Nguyễn');
  });

  it('contains JSON block with courtSecretary field', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"courtSecretary"');
    expect(result).toContain('Thư ký Trần');
  });

  it('contains JSON block with participants array', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result).toContain('"participants"');
    expect(result).toContain('Bị cáo A');
  });

  it('contains the templatePrompt text verbatim at the end', () => {
    const result = buildOfficerPrompt({ info: sampleInfo, templatePrompt });
    expect(result.endsWith(templatePrompt)).toBe(true);
  });

  it('handles empty participants array', () => {
    const infoNoParticipants: OfficerInfo = { ...sampleInfo, participants: [] };
    const result = buildOfficerPrompt({ info: infoNoParticipants, templatePrompt });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.participants).toEqual([]);
  });
});
