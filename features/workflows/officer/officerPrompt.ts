import type { OfficerInfo } from '../../minutes/types';

function toCleanText(value: string): string {
  return (value ?? '').trim();
}

export function buildOfficerPrompt(args: {
  info: OfficerInfo;
  templatePrompt: string;
}): string {
  const participants = (args.info.participants ?? [])
    .map(p => ({
      name: toCleanText(p.name),
      title: toCleanText(p.title ?? ''),
      role: p.role ?? 'Tham dự',
    }))
    .filter(p => p.name.length > 0);

  const infoBlock = {
    title: toCleanText(args.info.title) || null,
    presiding: toCleanText(args.info.presiding) || null,
    courtSecretary: toCleanText(args.info.courtSecretary) || null,
    participants,
    datetime: toCleanText(args.info.datetime) || null,
    location: toCleanText(args.info.location) || null,
  };

  return `Bạn sẽ tạo BIÊN BẢN PHIÊN TOÀ/HỒ SƠ PHÁP LÝ dựa trên transcript người dùng cung cấp.\n\n` +
    `Dưới đây là THÔNG TIN VỤ ÁN do người dùng nhập (ground truth). Quy tắc bắt buộc:\n` +
    `- Nếu trường nào trong JSON có giá trị khác null/khác rỗng: PHẢI dùng đúng giá trị đó, KHÔNG tự suy đoán khác.\n` +
    `- Nếu trường nào null/rỗng: có thể suy ra từ transcript; nếu không có thì ghi \"Theo file ghi âm\" hoặc \"Không rõ\".\n\n` +
    `### THÔNG TIN VỤ ÁN (JSON)\n` +
    `${JSON.stringify(infoBlock, null, 2)}\n\n---\n\n` +
    `${args.templatePrompt}`;
}
