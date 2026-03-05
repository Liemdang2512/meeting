import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyIcon, CheckIcon, DownloadIcon } from './Icons';

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

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Tải về
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-white">
        <div className="prose prose-slate max-w-none prose-p:my-3 prose-headings:text-slate-800 prose-strong:text-indigo-900 prose-strong:font-bold">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};