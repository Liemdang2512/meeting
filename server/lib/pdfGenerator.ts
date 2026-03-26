import puppeteer from 'puppeteer';
import { markdownToHtml, escHtml } from '../../lib/markdownUtils';

export interface PdfMeetingData {
  companyName: string;
  companyAddress: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: Array<{ name: string; title?: string; role?: string }>;
  minutesMarkdown: string;
}

function buildPdfHtml(data: PdfMeetingData): string {
  const infoRows: string[] = [];
  if (data.companyName)     infoRows.push(`<p><strong>Doanh nghiệp:</strong> ${escHtml(data.companyName)}</p>`);
  if (data.companyAddress)  infoRows.push(`<p><strong>Địa chỉ:</strong> ${escHtml(data.companyAddress)}</p>`);
  if (data.meetingDatetime) infoRows.push(`<p><strong>Thời gian:</strong> ${escHtml(data.meetingDatetime)}</p>`);
  if (data.meetingLocation) infoRows.push(`<p><strong>Địa điểm:</strong> ${escHtml(data.meetingLocation)}</p>`);

  let participantsHtml = '';
  if (data.participants.length > 0) {
    const items = data.participants.map(p => {
      const parts = [p.name, p.title, p.role].filter((v): v is string => Boolean(v)).map(escHtml).join(' - ');
      return `<li>${parts}</li>`;
    }).join('');
    participantsHtml = `<p><strong>Thành phần tham dự:</strong></p><ul>${items}</ul>`;
  }

  const contentHtml = markdownToHtml(data.minutesMarkdown);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Biên bản cuộc họp</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; }
    .header { margin-bottom: 1em; }
    .divider { border: none; border-top: 1px solid #aaa; margin: 1em 0; }
    h1 { font-size: 15pt; font-weight: 700; text-align: center; margin: 0.5em 0 0.8em; }
    h2 { font-size: 11pt; font-weight: 700; margin: 1em 0 0.4em; }
    h3 { font-size: 11pt; font-weight: 600; font-style: italic; margin: 0.8em 0 0.3em; }
    p  { margin: 0 0 0.5em; text-align: justify; }
    ul, ol { padding-left: 1.5em; margin-bottom: 0.5em; }
    li { margin-bottom: 0.2em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 10pt; }
    th { border: 1px solid #000; padding: 6px 10px; background: #f2f2f2; font-weight: 700; text-align: left; }
    td { border: 1px solid #000; padding: 6px 10px; vertical-align: top; }
    hr { border: none; border-top: 1px solid #aaa; margin: 1em 0; }
    strong { font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    ${infoRows.join('\n    ')}
    ${participantsHtml}
  </div>
  ${infoRows.length > 0 || participantsHtml ? '<hr class="divider">' : ''}
  ${contentHtml}
</body>
</html>`;
}

export async function generateMinutesPdfBuffer(data: PdfMeetingData): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(buildPdfHtml(data), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
