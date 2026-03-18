import React, { useRef } from 'react';
import { useDiagramFromText } from './hooks/useDiagramFromText';
import { DiagramCanvas } from './components/DiagramCanvas';
import type { AuthUser } from '../../lib/auth';

const MAX_TEXT_LENGTH = 50_000;

interface MindmapPageProps {
  user?: AuthUser | null;
}

export const MindmapPage: React.FC<MindmapPageProps> = ({ user }) => {
  const [text, setText] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { diagram, loading, error, generate } = useDiagramFromText();

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

  const handleGenerate = async () => {
    if (!text.trim()) return;
    await generate(text, user?.userId ?? null);
  };

  const textTooLong = text.length >= MAX_TEXT_LENGTH;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Sơ đồ thông tin</h2>
        <p className="text-sm text-slate-500 mt-1">
          Nhập văn bản (tối đa 50.000 ký tự) để tạo sơ đồ thông tin trực quan.
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
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
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
          placeholder="Dán văn bản vào đây hoặc tải file text (.txt, .md)..."
          className="w-full h-48 text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />

        <button
          onClick={handleGenerate}
          disabled={!text.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          {loading ? 'Đang tạo sơ đồ...' : 'Tạo diagram'}
        </button>
      </div>

      {/* Result */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ background: '#070d1c' }}>
        {loading && (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm gap-2">
            <span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
            Đang phân tích và tạo sơ đồ thông tin...
          </div>
        )}
        {error && (
          <div className="m-4 bg-red-950 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {!loading && !error && diagram && (
          <div className="p-4">
            <div className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">{diagram.title}</div>
            <DiagramCanvas diagram={diagram} />
          </div>
        )}
        {!loading && !error && !diagram && (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Nhập văn bản và nhấn "Tạo diagram" để xem sơ đồ thông tin.
          </div>
        )}
      </div>
    </div>
  );
};
