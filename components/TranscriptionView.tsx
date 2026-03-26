import React, { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyIcon, CheckIcon, DownloadIcon } from './Icons';
import { formatMinutesMarkdown } from '../lib/meetingMinutesFormatter';
import { downloadAsDocx, downloadAsPdf } from '../lib/minutesDocxExport';
import { useMindmapTree } from '../features/mindmap/hooks/useMindmapTree';
import { MindmapTreeCanvas } from '../features/mindmap/components/MindmapTreeCanvas';
import { GitBranch } from 'lucide-react';


interface TranscriptionViewProps {
  text: string;
  userId?: string | null;
  onMindmapCapture?: (fn: (() => Promise<string | null>) | null) => void;
  onMindmapPdfReady?: (pdfDataUrl: string) => void;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({ text, userId, onMindmapCapture, onMindmapPdfReady }) => {
  const formattedText = useMemo(() => formatMinutesMarkdown(text), [text]);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'minutes' | 'mindmap'>('minutes');
  const contentRef = useRef<HTMLDivElement>(null);
  const { tree, loading: mindmapLoading, error: mindmapError, generate: generateMindmap } = useMindmapTree();

  const handleSwitchToMindmap = () => {
    setActiveTab('mindmap');
    if (!tree && !mindmapLoading) {
      generateMindmap(formattedText, userId);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    setPdfLoading(true);
    downloadAsPdf(formattedText, () => setPdfLoading(false));
  };

  const handleDownload = async () => {
    await downloadAsDocx(formattedText, `ghi-chep-${new Date().toISOString().slice(0, 10)}.docx`);
  };

  return (
    <div className="bg-white border-slate-200 shadow-sm rounded-xl flex flex-col h-full border">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('minutes')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'minutes' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Biên bản
          </button>
          <button
            onClick={handleSwitchToMindmap}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'mindmap' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <GitBranch size={14} />
            Sơ đồ tư duy
          </button>
        </div>

        {/* Actions — only for minutes tab */}
        {activeTab === 'minutes' && (
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
        )}
      </div>

      {/* Mindmap tab */}
      {activeTab === 'mindmap' && (
        <div className="flex-1 overflow-hidden">
          {mindmapLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span className="animate-spin inline-block w-8 h-8 border-indigo-400 border-t-transparent rounded-full" style={{ borderWidth: 3 }} />
              <p className="text-sm text-slate-500">Đang tạo sơ đồ tư duy...</p>
            </div>
          )}
          {mindmapError && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {mindmapError}
            </div>
          )}
          {!mindmapLoading && !mindmapError && tree && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tree.label}</span>
                <span className="text-xs text-slate-400">· {tree.children.length} nhánh chính · {tree.children.reduce((s, b) => s + (b.children?.length ?? 0), 0)} nhánh con</span>
              </div>
              <div className="flex-1">
                <MindmapTreeCanvas
                  tree={tree}
                  onCaptureReady={(fn) => onMindmapCapture?.(fn)}
                  onPdfReady={onMindmapPdfReady}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minutes tab */}
      {activeTab === 'minutes' && (
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
      )}
    </div>
  );
};