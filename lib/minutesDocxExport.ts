import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  SectionType,
} from 'docx';
import { markdownToHtml } from './markdownUtils';
export { markdownToHtml } from './markdownUtils';

const DOCX_FONT = 'Inter';
const DOCX_SIZE_NORMAL = 22; // 11pt in half-points
const DOCX_SIZE_H1 = 30;     // 15pt
const DOCX_SIZE_H2 = 22;     // 11pt bold
const DOCX_SIZE_H3 = 22;     // 11pt bold italic

function parseInlineRuns(text: string, baseSize: number, baseFont: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: baseFont, size: baseSize }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: baseFont, size: baseSize }));
    }
  }
  return runs;
}

export function markdownToDocxParagraphs(markdown: string): Array<Paragraph | Table> {
  const lines = markdown.split('\n');
  const blocks: Array<Paragraph | Table> = [];

  const isTableDivider = (line: string): boolean =>
    /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/.test(line);

  const parseTable = (startIndex: number): { table: Table; nextIndex: number } => {
    const headerLine = lines[startIndex];
    const headerCells = headerLine.split('|').map((c) => c.trim()).filter(Boolean);

    const rows: TableRow[] = [];
    rows.push(
      new TableRow({
        children: headerCells.map(
          (text) =>
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, bold: true, font: DOCX_FONT, size: DOCX_SIZE_NORMAL })],
                }),
              ],
            }),
        ),
      }),
    );

    let i = startIndex + 2;
    for (; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.includes('|')) break;
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length === 0) continue;
      rows.push(
        new TableRow({
          children: cells.map(
            (text) =>
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  children: [new TextRun({ text, font: DOCX_FONT, size: DOCX_SIZE_NORMAL })],
                })],
              }),
          ),
        }),
      );
    }

    return { table: new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), nextIndex: i };
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const { table, nextIndex } = parseTable(i);
      blocks.push(table);
      i = nextIndex - 1;
      continue;
    }

    if (/^# /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^# /, ''), bold: true, font: DOCX_FONT, size: DOCX_SIZE_H1 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
      }));
    } else if (/^## /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^## /, ''), bold: true, font: DOCX_FONT, size: DOCX_SIZE_H2 })],
        spacing: { before: 200, after: 80 },
      }));
    } else if (/^### /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, italics: true, font: DOCX_FONT, size: DOCX_SIZE_H3 })],
        spacing: { before: 160, after: 60 },
      }));
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA' } },
        spacing: { before: 120, after: 120 },
        children: [],
      }));
    } else if (line.trim() === '') {
      blocks.push(new Paragraph({ spacing: { after: 80 } }));
    } else {
      blocks.push(new Paragraph({
        children: parseInlineRuns(line, DOCX_SIZE_NORMAL, DOCX_FONT),
        spacing: { after: 80 },
        alignment: AlignmentType.LEFT,
      }));
    }
  }

  return blocks;
}

export async function downloadAsDocx(markdown: string, filename: string): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {
        type: SectionType.CONTINUOUS,
        page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
      },
      children: markdownToDocxParagraphs(markdown),
    }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export (print dialog, A4) ─────────────────────────────────────────────

export function downloadAsPdf(markdown: string, onDone?: () => void): void {
  const content = markdownToHtml(markdown);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) { onDone?.(); return; }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Biên bản cuộc họp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; }
    @media print { @page { size: A4; margin: 2cm; } body { margin: 0; } }
    @media screen { body { max-width: 21cm; margin: 2cm auto; padding: 2cm; } }
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
<body>${content}</body>
</html>`);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.focus(); printWindow.print(); onDone?.(); };
  setTimeout(() => { if (!printWindow.closed) printWindow.print(); onDone?.(); }, 1200);
}
