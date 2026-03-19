import { jsPDF } from 'jspdf';

export interface PdfMeetingData {
  companyName: string;
  companyAddress: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: Array<{ name: string; title?: string; role?: string }>;
  minutesMarkdown: string;
}

export function generateMinutesPdfBuffer(data: PdfMeetingData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 25;

  const addNewPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BIEN BAN CUOC HOP', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Meeting info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if (data.companyName) { doc.text(`Doanh nghiep: ${data.companyName}`, margin, y); y += 6; }
  if (data.companyAddress) { doc.text(`Dia chi: ${data.companyAddress}`, margin, y); y += 6; }
  if (data.meetingDatetime) { doc.text(`Thoi gian: ${data.meetingDatetime}`, margin, y); y += 6; }
  if (data.meetingLocation) { doc.text(`Dia diem: ${data.meetingLocation}`, margin, y); y += 6; }

  // Participants
  if (data.participants.length > 0) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Thanh phan tham du:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    for (const p of data.participants) {
      addNewPageIfNeeded(6);
      const parts = [p.name, p.title, p.role].filter(Boolean).join(' - ');
      doc.text(`  - ${parts}`, margin, y);
      y += 5;
    }
  }

  // Divider
  y += 6;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Minutes content
  const lines = data.minutesMarkdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { y += 3; continue; }

    if (trimmed.startsWith('# ')) {
      addNewPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const text = trimmed.slice(2).replace(/\*\*/g, '');
      doc.text(text, pageWidth / 2, y, { align: 'center' });
      y += 8;
    } else if (trimmed.startsWith('## ')) {
      addNewPageIfNeeded(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const text = trimmed.slice(3).replace(/\*\*/g, '');
      doc.text(text, margin, y);
      y += 7;
    } else if (trimmed.startsWith('### ')) {
      addNewPageIfNeeded(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(11);
      const text = trimmed.slice(4).replace(/\*\*/g, '');
      doc.text(text, margin, y);
      y += 6;
    } else if (trimmed.startsWith('---')) {
      addNewPageIfNeeded(6);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    } else {
      // Regular text — wrap long lines
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const text = trimmed.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(text, maxWidth);
      for (const wline of wrapped) {
        addNewPageIfNeeded(6);
        doc.text(wline, margin, y);
        y += 5;
      }
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
