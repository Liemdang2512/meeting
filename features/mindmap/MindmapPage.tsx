import React, { useState, useRef } from 'react';
import { useMindmapFromText } from './hooks/useMindmapFromText';
import { useChecklistFromText } from './hooks/useChecklistFromText';
import { useChecklistStorage } from './hooks/useChecklistStorage';
import { MindmapCanvas } from './components/MindmapCanvas';
import { ChecklistList } from './components/ChecklistList';
import type { AuthUser } from '../../lib/auth';

const MAX_TEXT_LENGTH = 50_000;

type TabId = 'mindmap' | 'checklist';

interface MindmapPageProps {
  user?: AuthUser | null;
}

export const MindmapPage: React.FC<MindmapPageProps> = ({ user }) => {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('mindmap');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tree, loading: mindmapLoading, error: mindmapError, generate: generateMindmap } = useMindmapFromText();
  const { loading: checklistLoading, error: checklistError, generate: generateChecklist } = useChecklistFromText();
  const { items, setItems, toggleCompleted, clearChecklist } = useChecklistStorage();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val.slice(0, MAX_TEXT_LENGTH));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content.slice(0, MAX_TEXT_LENGTH));
    };
    reader.onerror = () => alert('Không thể đọc file. Vui lòng thử lại.');
    reader.readAsText(file, 'utf-8');

    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleGenerateMindmap = async () => {
    if (!text.trim()) return;
    setActiveTab('mindmap');
    await generateMindmap(text, user?.userId ?? null);
  };

  const handleGenerateChecklist = async () => {
    if (!text.trim()) return;
    setActiveTab('checklist');
    const newItems = await generateChecklist(text, user?.userId ?? null);
    if (newItems.length > 0) {
      setItems(newItems);
    }
  };

  const textTooLong = text.length >= MAX_TEXT_LENGTH;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Sơ đồ tư duy & Checklist</h2>
        <p className="text-sm text-slate-500 mt-1">
          Nhập văn bản (tối đa 50.000 ký tự) để tạo sơ đồ tư duy hoặc checklist công việc phân cấp.
        </p>
      </div>

      {/* Input area */}
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {textTooLong && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Văn bản đã đạt giới hạn 50.000 ký tự. Nội dung vượt quá sẽ bị cắt khi xử lý.
          </div>
        )}

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Dán văn bản vào đây hoặc tải file text (.txt, .md)..."
          className="w-full h-48 text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerateMindmap}
            disabled={!text.trim() || mindmapLoading || checklistLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {mindmapLoading ? 'Đang tạo mindmap...' : 'Tạo mindmap'}
          </button>
          <button
            onClick={handleGenerateChecklist}
            disabled={!text.trim() || mindmapLoading || checklistLoading}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {checklistLoading ? 'Đang tạo checklist...' : 'Tạo checklist từ nội dung'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('mindmap')}
            className={`flex-1 text-sm font-medium py-3 transition-colors ${
              activeTab === 'mindmap'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Sơ đồ tư duy
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 text-sm font-medium py-3 transition-colors ${
              activeTab === 'checklist'
                ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-500'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Checklist {items.length > 0 && `(${items.length})`}
          </button>
        </div>

        <div className="p-4">
          {/* Mindmap tab */}
          {activeTab === 'mindmap' && (
            <div>
              {mindmapLoading && (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm gap-2">
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                  Đang phân tích và tạo sơ đồ tư duy...
                </div>
              )}
              {mindmapError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {mindmapError}
                </div>
              )}
              {!mindmapLoading && !mindmapError && tree && (
                <MindmapCanvas tree={tree} />
              )}
              {!mindmapLoading && !mindmapError && !tree && (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  Nhập văn bản và nhấn "Tạo mindmap" để xem sơ đồ tư duy.
                </div>
              )}
            </div>
          )}

          {/* Checklist tab */}
          {activeTab === 'checklist' && (
            <div>
              {checklistLoading && (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm gap-2">
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full" />
                  Đang phân tích và tạo checklist...
                </div>
              )}
              {checklistError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {checklistError}
                </div>
              )}
              {!checklistLoading && (
                <ChecklistList
                  items={items}
                  onToggle={toggleCompleted}
                  onClear={items.length > 0 ? clearChecklist : undefined}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
