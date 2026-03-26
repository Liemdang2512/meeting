import { describe, it, expect } from 'vitest';
import { generateMinutesPdfBuffer } from '../pdfGenerator';

const baseData = {
  companyName: 'Công ty TNHH Test',
  companyAddress: '123 Đường ABC, TP.HCM',
  meetingDatetime: '09:00 ngày 20/03/2026',
  meetingLocation: 'Phòng họp A',
  participants: [
    { name: 'Nguyễn Văn A', title: 'Giám đốc', role: 'Chủ trì' },
    { name: 'Trần Thị B', title: 'Kế toán' },
  ],
  minutesMarkdown: '# Biên bản\n\n## Nội dung chính\n\nCuộc họp diễn ra thuận lợi.',
};

describe('generateMinutesPdfBuffer', () => {
  it('returns a Buffer', async () => {
    const buf = await generateMinutesPdfBuffer(baseData);
    expect(Buffer.isBuffer(buf)).toBe(true);
  }, 30000);

  it('Buffer starts with PDF magic bytes (%PDF)', async () => {
    const buf = await generateMinutesPdfBuffer(baseData);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  }, 30000);

  it('handles empty participants array', async () => {
    const buf = await generateMinutesPdfBuffer({ ...baseData, participants: [] });
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  }, 30000);

  it('handles long markdown content with page breaks', async () => {
    const longMarkdown = Array.from({ length: 60 }, (_, i) =>
      `## Mục ${i + 1}\n\nNội dung của mục số ${i + 1} với nhiều chữ để test ngắt trang.`
    ).join('\n\n');
    const buf = await generateMinutesPdfBuffer({ ...baseData, minutesMarkdown: longMarkdown });
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(10000);
  }, 30000);
});
