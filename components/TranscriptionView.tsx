import React, { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon, CheckIcon, DownloadIcon } from './Icons';
import { formatMinutesMarkdown } from '../lib/meetingMinutesFormatter';
import { downloadAsDocx, downloadAsPdf } from '../lib/minutesDocxExport';
import { useMindmapTree } from '../features/mindmap/hooks/useMindmapTree';
import { MindmapTreeCanvas } from '../features/mindmap/components/MindmapTreeCanvas';
import { GitBranch, Copy, Check, Download, FileText } from 'lucide-react';


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
  const [wordLoading, setWordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'minutes' | 'mindmap'>('minutes');
  const contentRef = useRef<HTMLDivElement>(null);
  const { tree, loading: mindmapLoading, error: mindmapError, generate: generateMindmap } = useMindmapTree();

  const handleSwitchToMindmap = () => {
    setActiveTab('mindmap');
    if (!tree && !mindmapLoading) {
      generateMindmap(formattedText, userId);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback cho môi trường không hỗ trợ Clipboard API
      const ta = document.createElement('textarea');
      ta.value = formattedText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = () => {
    setPdfLoading(true);
    downloadAsPdf(formattedText, () => setPdfLoading(false));
  };

  const handleDownload = async () => {
    setWordLoading(true);
    try {
      await downloadAsDocx(formattedText, `ghi-chep-${new Date().toISOString().slice(0, 10)}.docx`);
    } finally {
      setWordLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5 flex flex-col h-full border border-outline-variant/5 overflow-hidden">
      {/* Result status bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AI đã xử lý xong
          </span>
        </div>
        <span className="text-xs text-on-surface-variant font-medium">Kết quả Phiên âm &amp; Biên bản họp</span>
      </div>

      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/10 bg-surface-container-low/30">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container-lowest p-1 rounded-xl shadow-sm" role="tablist" aria-label="Chế độ xem">
          <button
            role="tab"
            aria-selected={activeTab === 'minutes'}
            onClick={() => setActiveTab('minutes')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'minutes'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <FileText size={14} />
            Biên bản
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'mindmap'}
            onClick={handleSwitchToMindmap}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'mindmap'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <GitBranch size={14} />
            Sơ đồ tư duy
          </button>
        </div>

        {/* Actions — only for minutes tab */}
        {activeTab === 'minutes' && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-full min-w-[110px] ${
                copied
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Đã chép' : 'Sao chép'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all rounded-full disabled:opacity-50"
            >
              <Download size={15} />
              {pdfLoading ? 'Đang tạo...' : 'PDF'}
            </button>
            <button
              onClick={handleDownload}
              disabled={wordLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
            >
              <Download size={15} />
              {wordLoading ? 'Đang tạo...' : 'Word'}
            </button>
          </div>
        )}
      </div>

      {/* Mindmap tab */}
      {activeTab === 'mindmap' && (
        <div className="flex-1 overflow-hidden bg-surface-container-low/20">
          {mindmapLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <div className="relative">
                <div className="w-14 h-14 nebula-gradient rounded-full opacity-15 animate-ping absolute inset-0" />
                <div className="w-12 h-12 nebula-gradient rounded-full opacity-30 animate-pulse absolute inset-1" />
                <div className="w-10 h-10 relative flex items-center justify-center nebula-gradient rounded-full m-2">
                  <GitBranch size={18} className="text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-on-surface font-headline">Đang tạo sơ đồ tư duy...</p>
                <p className="text-xs text-on-surface-variant mt-1">AI đang phân tích và cấu trúc thông tin</p>
              </div>
            </div>
          )}
          {mindmapError && (
            <div className="m-6 bg-error/5 border border-error/20 rounded-xl px-4 py-3 text-sm text-error font-medium">
              {mindmapError}
            </div>
          )}
          {!mindmapLoading && !mindmapError && tree && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} className="text-on-surface-variant" />
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">{tree.label}</span>
                <span className="text-xs text-on-surface-variant opacity-60">
                  · {tree.children.length} nhánh chính · {tree.children.reduce((s, b) => s + (b.children?.length ?? 0), 0)} nhánh con
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs text-secondary font-semibold">Phân tích hoàn tất</span>
                </div>
              </div>
              <div className="flex-1">
                <MindmapTreeCanvas
                  tree={tree}
                  onCaptureReady={(fn) => onMindmapCapture?.(fn)}
                  onPdfReady={onMindmapPdfReady}
                />
              </div>
              {/* Tag bar */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                {tree.children.slice(0, 4).map((branch) => (
                  <span
                    key={branch.label}
                    className="bg-surface-container-highest rounded-full px-3 py-1 text-on-surface-variant text-xs font-medium"
                  >
                    #{branch.label.replace(/\s+/g, '_').slice(0, 20)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minutes tab */}
      {activeTab === 'minutes' && (
        <div className="flex-1 overflow-y-auto bg-surface-container-low/30 p-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d9e2ff transparent' }}>
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
              boxShadow: '0 4px 24px rgba(78,69,228,0.08)',
              minHeight: '29.7cm',
              borderRadius: '12px',
            }}
            className="doc-view"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
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
