import React, { useRef } from 'react';
import { useMindmapTree } from './hooks/useMindmapTree';
import { MindmapTreeCanvas } from './components/MindmapTreeCanvas';
import type { AuthUser } from '../../lib/auth';
import { FileText, Zap, GitBranch, List } from 'lucide-react';

const MAX_TEXT_LENGTH = 50_000;

interface MindmapPageProps {
  user?: AuthUser | null;
}

// ── Empty state illustration ──────────────────────────────────────────────────

const EmptyStateIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-5 text-center px-6">
    {/* Mini mindmap SVG */}
    <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Center node */}
      <rect x="62" y="46" width="56" height="28" rx="14" fill="#1e293b" />
      <text x="90" y="64" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">Chủ đề</text>

      {/* Right branches */}
      <path d="M118 52 Q138 52 148 38" stroke="#e11d48" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="148" y="28" width="28" height="20" rx="5" fill="white" stroke="#e11d48" strokeWidth="1.5" />
      <text x="162" y="41" textAnchor="middle" fontSize="7" fill="#e11d48" fontWeight="600">Nhánh 1</text>

      <path d="M118 60 Q138 60 148 68" stroke="#0284c7" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="148" y="58" width="28" height="20" rx="5" fill="white" stroke="#0284c7" strokeWidth="1.5" />
      <text x="162" y="71" textAnchor="middle" fontSize="7" fill="#0284c7" fontWeight="600">Nhánh 2</text>

      {/* Left branches */}
      <path d="M62 52 Q42 52 32 38" stroke="#16a34a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="4" y="28" width="28" height="20" rx="5" fill="white" stroke="#16a34a" strokeWidth="1.5" />
      <text x="18" y="41" textAnchor="middle" fontSize="7" fill="#16a34a" fontWeight="600">Nhánh 3</text>

      <path d="M62 60 Q42 60 32 72" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="4" y="62" width="28" height="20" rx="5" fill="white" stroke="#7c3aed" strokeWidth="1.5" />
      <text x="18" y="75" textAnchor="middle" fontSize="7" fill="#7c3aed" fontWeight="600">Nhánh 4</text>

      {/* Leaf nodes */}
      <path d="M176 38 Q178 30 170 25" stroke="#e11d48" strokeWidth="1.2" strokeOpacity="0.5" fill="none" />
      <rect x="155" y="18" width="22" height="10" rx="3" fill="#fef2f2" stroke="#e11d48" strokeWidth="1" strokeOpacity="0.5" />

      <path d="M176 68 Q178 76 170 82" stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.5" fill="none" />
      <rect x="155" y="78" width="22" height="10" rx="3" fill="#eff6ff" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.5" />
    </svg>

    {/* How it works */}
    <div className="grid grid-cols-3 gap-4 max-w-lg">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <FileText size={18} className="text-slate-500" />
        </div>
        <span className="text-xs text-slate-500 leading-snug">Dán văn bản<br />hoặc tải file</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Zap size={18} className="text-indigo-500" />
        </div>
        <span className="text-xs text-slate-500 leading-snug">AI phân tích<br />& trích xuất</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <GitBranch size={18} className="text-emerald-500" />
        </div>
        <span className="text-xs text-slate-500 leading-snug">Sơ đồ tư duy<br />trực quan</span>
      </div>
    </div>

    <p className="text-sm text-slate-400">
      Nhập văn bản và nhấn <span className="font-medium text-indigo-500">"Tạo sơ đồ tư duy"</span> để bắt đầu
    </p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export const MindmapPage: React.FC<MindmapPageProps> = ({ user }) => {
  const [text, setText] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tree, loading, error, generate } = useMindmapTree();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, MAX_TEXT_LENGTH));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText((reader.result as string).slice(0, MAX_TEXT_LENGTH));
    reader.onerror = () => alert('Không thể đọc file. Vui lòng thử lại.');
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const textTooLong = text.length >= MAX_TEXT_LENGTH;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <GitBranch size={20} className="text-[#1E40AF]" />
          Sơ đồ tư duy
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          AI tự động phân tích và tạo sơ đồ tư duy trực quan từ văn bản của bạn.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Văn bản đầu vào</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${textTooLong ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
              {text.length.toLocaleString()}/{MAX_TEXT_LENGTH.toLocaleString()}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={12} />
              Tải file text
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {textTooLong && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Văn bản đã đạt giới hạn 50.000 ký tự.
          </div>
        )}

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Dán nội dung cuộc họp, tài liệu, báo cáo... hoặc tải file text (.txt, .md)&#10;&#10;AI sẽ tự động phân tích và tạo sơ đồ tư duy với đầy đủ thông tin, số liệu, tên người liên quan."
          className="w-full h-44 text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/50 focus:border-[#1E40AF]"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => generate(text, user?.userId ?? null)}
            disabled={!text.trim() || loading}
            className="bg-[#1E3A8A] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors flex items-center gap-2"
          >
            <GitBranch size={15} />
            {loading ? 'Đang phân tích...' : 'Tạo sơ đồ tư duy'}
          </button>

          {/* Info chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: <List size={11} />, label: '5-7 nhánh chính' },
              { icon: <Zap size={11} />, label: 'Trích xuất số liệu' },
              { icon: <FileText size={11} />, label: 'Export PNG/PDF' },
            ].map(({ icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
        {loading && (
          <div className="flex flex-col items-center justify-center h-56 gap-4">
            <span className="animate-spin inline-block w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full" style={{ borderWidth: 3 }} />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Đang phân tích văn bản...</p>
              <p className="text-xs text-slate-400 mt-1">AI đang trích xuất thông tin và tổ chức thành sơ đồ tư duy</p>
            </div>
          </div>
        )}
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {!loading && !error && tree && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tree.label}</span>
              <span className="text-xs text-slate-400">· {tree.children.length} nhánh chính · {tree.children.reduce((s, b) => s + (b.children?.length ?? 0), 0)} nhánh con</span>
            </div>
            <MindmapTreeCanvas tree={tree} />
          </div>
        )}
        {!loading && !error && !tree && <EmptyStateIllustration />}
      </div>
    </div>
  );
};
