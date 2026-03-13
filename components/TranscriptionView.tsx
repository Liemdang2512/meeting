import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyIcon, CheckIcon, DownloadIcon } from './Icons';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle,
} from 'docx';

function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    // H1
    if (/^# /.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^# /, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
      }));
    // H2
    } else if (/^## /.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^## /, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      }));
    // H3
    } else if (/^### /.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^### /, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      }));
    // Dấu phân cách ---
    } else if (/^---+$/.test(line.trim())) {
      paragraphs.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA' } },
        spacing: { before: 120, after: 120 },
        children: [],
      }));
    // Dòng trống
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
    // Dòng thường (có thể chứa **bold**)
    } else {
      const runs: TextRun[] = [];
      // Tách theo **bold**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
        } else if (part) {
          runs.push(new TextRun({ text: part }));
        }
      }
      paragraphs.push(new Paragraph({
        children: runs,
        spacing: { after: 80 },
        alignment: AlignmentType.LEFT,
      }));
    }
  }

  return paragraphs;
}

interface TranscriptionViewProps {
  text: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: markdownToDocxParagraphs(text),
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-700">Kết quả (Văn bản)</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${copied
                ? 'bg-green-100 text-green-700'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Tải về
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-white">
        <div className="prose prose-slate max-w-none prose-p:my-3 prose-headings:text-slate-800 prose-strong:text-blue-900 prose-strong:font-bold">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};