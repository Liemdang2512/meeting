import React, { useRef } from 'react';
import { useMindmapTree } from './hooks/useMindmapTree';
import { MindmapTreeCanvas } from './components/MindmapTreeCanvas';
import type { AuthUser } from '../../lib/auth';
import {
  FileText,
  Zap,
  GitBranch,
  List,
  Download,
  Plus,
  Sparkles,
  BarChart2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Mic,
} from 'lucide-react';

const MAX_TEXT_LENGTH = 50_000;

interface MindmapPageProps {
  user?: AuthUser | null;
  navigate?: (path: string) => void;
}

// ── Empty state illustration ──────────────────────────────────────────────────

const EmptyStateIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-6 py-16">
    {/* Center node mockup */}
    <div className="relative flex items-center justify-center w-full max-w-sm h-48">
      {/* SVG connecting lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200">
        <path d="M200 100 L80 50" stroke="url(#emptyGrad)" strokeWidth="3" fill="none" />
        <path d="M200 100 L320 50" stroke="url(#emptyGrad)" strokeWidth="3" fill="none" />
        <path d="M200 100 L80 150" stroke="url(#emptyGrad)" strokeWidth="3" fill="none" />
        <path d="M200 100 L320 150" stroke="url(#emptyGrad)" strokeWidth="3" fill="none" />
        <defs>
          <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4e45e4" />
            <stop offset="100%" stopColor="#742fe5" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center node */}
      <div className="z-10 nebula-gradient p-5 rounded-2xl shadow-xl shadow-primary/20 flex flex-col items-center gap-1.5">
        <GitBranch size={24} className="text-white" />
        <span className="text-white font-headline font-bold text-sm">Chủ đề chính</span>
      </div>

      {/* Branch nodes */}
      <div className="absolute top-2 left-4 bg-surface-container-lowest p-3 rounded-xl shadow border border-primary/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <FileText size={12} />
        </div>
        <span className="font-headline font-bold text-on-surface text-xs">Nhánh 1</span>
      </div>
      <div className="absolute top-2 right-4 bg-surface-container-lowest p-3 rounded-xl shadow border border-secondary/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
          <Zap size={12} />
        </div>
        <span className="font-headline font-bold text-on-surface text-xs">Nhánh 2</span>
      </div>
      <div className="absolute bottom-2 left-4 bg-surface-container-lowest p-3 rounded-xl shadow border border-primary/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <BarChart2 size={12} />
        </div>
        <span className="font-headline font-bold text-on-surface text-xs">Nhánh 3</span>
      </div>
      <div className="absolute bottom-2 right-4 bg-surface-container-lowest p-3 rounded-xl shadow border border-secondary/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
          <List size={12} />
        </div>
        <span className="font-headline font-bold text-on-surface text-xs">Nhánh 4</span>
      </div>
    </div>

    {/* How it works chips */}
    <div className="grid grid-cols-3 gap-5 max-w-md">
      {[
        { icon: <FileText size={16} />, label: 'Dán văn bản hoặc tải file', color: 'bg-surface-container-high text-on-surface-variant' },
        { icon: <Zap size={16} />, label: 'AI phân tích & trích xuất', color: 'bg-primary/10 text-primary' },
        { icon: <GitBranch size={16} />, label: 'Sơ đồ tư duy trực quan', color: 'bg-secondary/10 text-secondary' },
      ].map(({ icon, label, color }) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
          <span className="text-xs text-on-surface-variant leading-snug text-center">{label}</span>
        </div>
      ))}
    </div>

    <p className="text-sm text-on-surface-variant">
      Nhập văn bản và nhấn{' '}
      <span className="font-semibold text-primary">"Tạo sơ đồ tư duy"</span> để bắt đầu
    </p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export const MindmapPage: React.FC<MindmapPageProps> = ({ user, navigate }) => {
  const [text, setText] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tree, loading, error, generate } = useMindmapTree();

  // Free users không có quyền dùng mindmap
  const hasMindmap = user?.role === 'admin' || user?.features?.includes('mindmap');
  if (!hasMindmap) {
    return (
      <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col items-center justify-center px-6 py-16 gap-8 text-center">
        <div className="w-20 h-20 rounded-2xl nebula-gradient flex items-center justify-center shadow-xl shadow-primary/25">
          <GitBranch size={36} className="text-white" />
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="font-headline font-extrabold text-3xl text-on-surface">Sơ đồ tư duy</h2>
          <p className="text-on-surface-variant leading-relaxed">
            Tính năng này chỉ dành cho gói <span className="font-semibold text-primary">Pro</span>. Nâng cấp để biến nội dung cuộc họp thành sơ đồ tư duy trực quan bằng AI.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate?.('/pricing')}
            className="px-8 py-3 rounded-full nebula-gradient text-white font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            Xem các gói nâng cấp
          </button>
          <button
            onClick={() => navigate?.('/specialist')}
            className="px-8 py-3 rounded-full border border-outline-variant/30 text-on-surface-variant font-medium hover:bg-surface-container transition-all active:scale-95"
          >
            Quay lại ghi chép
          </button>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      {/* Page header */}
      <div className="px-8 pt-8 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight mb-2">
              Phân tích &amp; Sơ đồ tư duy
            </h2>
            <p className="text-on-surface-variant max-w-2xl font-body text-sm leading-relaxed">
              Biến nội dung cuộc họp và tài liệu của bạn thành cấu trúc trực quan thông minh. AI sẽ
              tự động phân loại và liên kết các ý tưởng chính.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="px-5 py-2.5 rounded-full border border-outline-variant/30 text-on-surface-variant font-medium text-sm flex items-center gap-2 hover:bg-surface-container transition-all active:scale-95">
              <Download size={15} />
              Export PNG/PDF
            </button>
            <button className="px-5 py-2.5 rounded-full nebula-gradient text-white font-bold text-sm shadow-lg shadow-primary/25 flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
              <Plus size={15} />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="flex-1 px-8 pb-8 max-w-7xl mx-auto w-full grid grid-cols-12 gap-6 mt-4">
        {/* Left: Input section */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col flex-1 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface">Văn bản đầu vào</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                    textTooLong
                      ? 'text-error bg-error/10'
                      : 'text-primary bg-primary/10'
                  }`}
                >
                  {textTooLong ? 'Đã đạt giới hạn' : 'AI Ready'}
                </span>
              </div>
            </div>

            {/* File upload */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant">
                {text.length.toLocaleString()}/{MAX_TEXT_LENGTH.toLocaleString()} ký tự
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-surface-container-low hover:bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-outline-variant/20"
              >
                <FileText size={12} />
                Tải file text
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {textTooLong && (
              <div className="text-xs text-error bg-error/5 border border-error/20 rounded-xl px-3 py-2 mb-3">
                Văn bản đã đạt giới hạn 50.000 ký tự.
              </div>
            )}

            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Dán nội dung cuộc họp hoặc ghi chú tại đây để AI phân tích..."
              className="flex-1 w-full bg-surface-container-low border-none rounded-2xl p-4 text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 resize-none font-body text-sm leading-relaxed min-h-[240px]"
            />

            <div className="mt-5 space-y-3">
              <button
                onClick={() => generate(text, user?.userId ?? null)}
                disabled={!text.trim() || loading}
                className="w-full py-4 rounded-2xl nebula-gradient text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                <Sparkles size={18} />
                {loading ? 'Đang phân tích...' : 'Tạo sơ đồ tư duy'}
              </button>
              <button
                disabled={!text.trim() || loading}
                className="w-full py-4 rounded-2xl bg-surface-container-high text-primary font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BarChart2 size={18} />
                Trích xuất số liệu
              </button>
            </div>
          </div>
        </div>

        {/* Right: Visualization canvas */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
          <div className="bg-surface-container-low rounded-3xl p-2 shadow-inner flex-1 relative overflow-hidden border border-outline-variant/10 min-h-[500px]">
            {/* Canvas controls */}
            <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
              {[
                { icon: <ZoomIn size={16} />, label: 'Zoom in' },
                { icon: <ZoomOut size={16} />, label: 'Zoom out' },
                { icon: <Crosshair size={16} />, label: 'Center' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-10 h-10 rounded-xl glass-panel border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Content area */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                <div className="relative">
                  <div className="w-12 h-12 nebula-gradient rounded-full opacity-20 animate-ping absolute inset-0" />
                  <div className="w-10 h-10 nebula-gradient rounded-full opacity-40 animate-pulse absolute inset-1" />
                  <div className="w-8 h-8 relative flex items-center justify-center nebula-gradient rounded-full m-2">
                    <Sparkles size={16} className="text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-on-surface font-headline">
                    Đang phân tích văn bản...
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    AI đang trích xuất thông tin và tổ chức thành sơ đồ tư duy
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="m-5 bg-error/5 border border-error/20 rounded-2xl px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {!loading && !error && tree && (
              <div className="p-5 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} className="text-on-surface-variant" />
                  <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                    {tree.label}
                  </span>
                  <span className="text-xs text-on-surface-variant/60">
                    · {tree.children.length} nhánh chính ·{' '}
                    {tree.children.reduce((s, b) => s + (b.children?.length ?? 0), 0)} nhánh con
                  </span>
                </div>
                <div className="flex-1">
                  <MindmapTreeCanvas tree={tree} />
                </div>
              </div>
            )}

            {!loading && !error && !tree && <EmptyStateIllustration />}

            {/* Zoom indicator */}
            {tree && !loading && (
              <div className="absolute bottom-5 right-5 glass-panel px-4 py-1.5 rounded-full border border-outline-variant/20 text-xs font-bold text-on-surface-variant">
                Tỷ lệ: 100%
              </div>
            )}
          </div>

          {/* Insight / tag bar */}
          {(tree || loading) && (
            <div className="flex flex-wrap gap-3">
              <div className="bg-secondary/10 rounded-full px-4 py-2 flex items-center gap-2 border border-secondary/10">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-secondary text-xs font-bold">
                  {loading ? 'AI đang phân tích thực thể...' : 'Phân tích hoàn tất'}
                </span>
              </div>
              {tree?.children.slice(0, 3).map((branch) => (
                <div
                  key={branch.label}
                  className="bg-surface-container-highest rounded-full px-4 py-2 text-on-surface-variant text-xs font-medium cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  #{branch.label.replace(/\s+/g, '_')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
