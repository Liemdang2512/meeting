import type { ReporterInfo } from '../../../features/minutes/types';

function toCleanText(value: string): string {
  return (value ?? '').trim();
}

export function buildReporterPrompt(args: {
  info: ReporterInfo;
  templatePrompt: string;
}): string {
  const infoBlock = {
    interviewTitle: toCleanText(args.info.interviewTitle) || null,
    guestName: toCleanText(args.info.guestName) || null,
    reporter: toCleanText(args.info.reporter) || null,
    datetime: toCleanText(args.info.datetime) || null,
    location: toCleanText(args.info.location) || null,
  };

  return `Bạn sẽ tạo BÀI PHỎNG VẤN/BÁO CHÍ dựa trên transcript người dùng cung cấp.\n\n` +
    `Dưới đây là THÔNG TIN PHỎNG VẤN do người dùng nhập (ground truth). Quy tắc bắt buộc:\n` +
    `- Nếu trường nào trong JSON có giá trị khác null/khác rỗng: PHẢI dùng đúng giá trị đó, KHÔNG tự suy đoán khác.\n` +
    `- Nếu trường nào null/rỗng: có thể suy ra từ transcript.\n\n` +
    `### THÔNG TIN PHỎNG VẤN (JSON)\n` +
    `${JSON.stringify(infoBlock, null, 2)}\n\n---\n\n` +
    `${args.templatePrompt}`;
}
