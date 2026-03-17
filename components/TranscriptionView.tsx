import React, { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyIcon, CheckIcon, DownloadIcon } from './Icons';
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
import { formatMinutesMarkdown } from '../lib/meetingMinutesFormatter';

// Chuyển markdown → HTML thuần, không qua DOM render
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inlineMd(text: string): string {
  return escHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  const isTableDiv = (l: string) => /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    if (/^# /.test(line))  { out.push(`<h1>${inlineMd(line.slice(2))}</h1>`); i++; continue; }
    if (/^## /.test(line)) { out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); i++; continue; }
    if (/^### /.test(line)){ out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); i++; continue; }
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); i++; continue; }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableDiv(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2;
      let t = '<table><thead><tr>' + headers.map(h => `<th>${inlineMd(h)}</th>`).join('') + '</tr></thead><tbody>';
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length) t += '<tr>' + cells.map(c => `<td>${inlineMd(c)}</td>`).join('') + '</tr>';
        i++;
      }
      out.push(t + '</tbody></table>');
      continue;
    }

    out.push(`<p>${inlineMd(line)}</p>`);
    i++;
  }
  return out.join('\n');
}

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

function markdownToDocxParagraphs(markdown: string): Array<Paragraph | Table> {
  const lines = markdown.split('\n');
  const blocks: Array<Paragraph | Table> = [];

  const isTableDivider = (line: string): boolean =>
    /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/.test(line);

  const parseTable = (startIndex: number): { table: Table; nextIndex: number } => {
    const headerLine = lines[startIndex];

    const headerCells = headerLine
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);

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
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
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

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    });

    return { table, nextIndex: i };
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Table
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const { table, nextIndex } = parseTable(i);
      blocks.push(table);
      i = nextIndex - 1;
      continue;
    }

    // H1 — tiêu đề chính, căn giữa
    if (/^# /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^# /, ''), bold: true, font: DOCX_FONT, size: DOCX_SIZE_H1 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
      }));
    // H2 — tiêu đề mục, in đậm
    } else if (/^## /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^## /, ''), bold: true, font: DOCX_FONT, size: DOCX_SIZE_H2 })],
        spacing: { before: 200, after: 80 },
      }));
    // H3 — tiêu đề phụ, in đậm nghiêng
    } else if (/^### /.test(line)) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, italics: true, font: DOCX_FONT, size: DOCX_SIZE_H3 })],
        spacing: { before: 160, after: 60 },
      }));
    // Dấu phân cách ---
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA' } },
        spacing: { before: 120, after: 120 },
        children: [],
      }));
    // Dòng trống
    } else if (line.trim() === '') {
      blocks.push(new Paragraph({ spacing: { after: 80 } }));
    // Dòng thường
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

interface TranscriptionViewProps {
  text: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ text }) => {
  const formattedText = useMemo(() => formatMinutesMarkdown(text), [text]);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    setPdfLoading(true);

    const content = markdownToHtml(formattedText);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { setPdfLoading(false); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Biên bản cuộc họp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    @media print {
      @page { size: A4; margin: 2cm; }
      body { margin: 0; }
    }
    @media screen {
      body { max-width: 21cm; margin: 2cm auto; padding: 2cm; }
    }
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

    // Chờ font/image load xong rồi mở print dialog
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setPdfLoading(false);
    };
    // Fallback nếu onload không trigger
    setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
      setPdfLoading(false);
    }, 1200);
  };

  const handleDownload = async () => {
    const doc = new Document({
      sections: [{
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: 1134,    // 2cm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children: markdownToDocxParagraphs(formattedText),
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghi-chep-${new Date().toISOString().slice(0, 10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border-slate-200 shadow-sm rounded-xl flex flex-col h-full border">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-sans font-medium text-xl text-slate-800">Kết quả</h3>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 px-4 py-2 border-slate-200 text-sm font-medium transition-all shadow-sm rounded-xl min-w-[120px] ${copied ? 'bg-indigo-600 text-white translate-y-px shadow-sm rounded-xl' : 'bg-white text-slate-800 hover:bg-slate-100 rounded-xl'}`}
          >
            {copied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 border-slate-200 text-sm font-medium bg-white text-slate-800 hover:bg-slate-100 transition-all shadow-sm rounded-xl border disabled:opacity-50"
          >
            <DownloadIcon className="w-5 h-5" />
            {pdfLoading ? 'Đang tạo...' : 'PDF'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 border-slate-200 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm rounded-xl border"
          >
            <DownloadIcon className="w-5 h-5" />
            Word
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
        <div
          ref={contentRef}
          style={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontSize: '11pt',
            lineHeight: '1.6',
            color: '#000000',
            backgroundColor: '#ffffff',
            maxWidth: '21cm',
            margin: '0 auto',
            padding: '2cm',
            boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
            minHeight: '29.7cm',
          }}
          className="doc-view"
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '15pt', fontWeight: '700', textAlign: 'center', marginTop: '0.5em', marginBottom: '0.8em', color: '#000' }}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '11pt', fontWeight: '700', marginTop: '1em', marginBottom: '0.4em', color: '#000' }}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '11pt', fontWeight: '600', fontStyle: 'italic', marginTop: '0.8em', marginBottom: '0.3em', color: '#000' }}>{children}</h3>
              ),
              p: ({ children }) => (
                <p style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '11pt', marginTop: 0, marginBottom: '0.5em', textAlign: 'justify', color: '#000' }}>{children}</p>
              ),
              strong: ({ children }) => (
                <strong style={{ fontWeight: '700', color: '#000' }}>{children}</strong>
              ),
              ul: ({ children }) => (
                <ul style={{ paddingLeft: '1.5em', marginBottom: '0.5em' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: '1.5em', marginBottom: '0.5em' }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '11pt', marginBottom: '0.2em', color: '#000' }}>{children}</li>
              ),
              table: ({ children }) => (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1em', fontSize: '10pt', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>{children}</table>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => (
                <th style={{ border: '1px solid #000', padding: '6px 10px', backgroundColor: '#f2f2f2', fontWeight: '700', textAlign: 'left', color: '#000' }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ border: '1px solid #000', padding: '6px 10px', verticalAlign: 'top', color: '#000' }}>{children}</td>
              ),
              hr: () => (
                <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '1em 0' }} />
              ),
              blockquote: ({ children }) => (
                <blockquote style={{ borderLeft: '3px solid #ccc', paddingLeft: '1em', marginLeft: 0, color: '#444', fontStyle: 'italic' }}>{children}</blockquote>
              ),
            }}
          >
            {formattedText}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};