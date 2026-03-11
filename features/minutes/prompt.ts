import type { MeetingInfo } from './types';

function toCleanText(value: string): string {
  return (value ?? '').trim();
}

export function buildMinutesCustomPrompt(args: {
  meetingInfo: MeetingInfo;
  templatePrompt: string;
}): string {
  const companyName = toCleanText(args.meetingInfo.companyName);
  const companyAddress = toCleanText(args.meetingInfo.companyAddress);
  const meetingDatetime = toCleanText(args.meetingInfo.meetingDatetime);
  const meetingLocation = toCleanText(args.meetingInfo.meetingLocation);

  const participants = (args.meetingInfo.participants ?? [])
    .map(p => ({
      name: toCleanText(p.name),
      title: toCleanText(p.title ?? ''),
      role: p.role ?? 'Tham dự',
    }))
    .filter(p => p.name.length > 0);

  const meetingInfoBlock = {
    companyName: companyName || null,
    companyAddress: companyAddress || null,
    meetingDatetime: meetingDatetime || null,
    meetingLocation: meetingLocation || null,
    participants,
  };

  return `Bạn sẽ tạo BIÊN BẢN CUỘC HỌP dựa trên transcript người dùng cung cấp.\n\n` +
    `Dưới đây là THÔNG TIN CUỘC HỌP do người dùng nhập (ground truth). Quy tắc bắt buộc:\n` +
    `- Nếu trường nào trong JSON có giá trị khác null/khác rỗng: PHẢI dùng đúng giá trị đó, KHÔNG tự suy đoán khác.\n` +
    `- Nếu trường nào null/rỗng: có thể suy ra từ transcript; nếu không có thì ghi \"Theo file ghi âm\" hoặc \"Không rõ\".\n\n` +
    `### THÔNG TIN CUỘC HỌP (JSON)\n` +
    `${JSON.stringify(meetingInfoBlock, null, 2)}\n\n` +
    `---\n\n` +
    `${args.templatePrompt}`;
}

