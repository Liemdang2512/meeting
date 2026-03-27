import React, { useState, useCallback, useRef, useEffect } from 'react';
import { setPendingUpload } from '../features/workflows/shared/fileStore';
import { SESSION_KEY_MEETING_LANGUAGE } from '../features/workflows/shared/sessionKeys';

type WorkflowGroup = 'reporter' | 'specialist' | 'officer';
type AudioLanguage = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'other';

interface MeetingLandingUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups?: string[];
  activeWorkflowGroup?: string;
}

interface Props {
  user: MeetingLandingUser;
  navigate: (path: string) => void;
  initialFiles?: File[];
}

const WORKFLOW_CARDS: { group: WorkflowGroup; label: string; description: string }[] = [
  { group: 'reporter', label: 'Bài phỏng vấn', description: 'Ghi chép & tổng hợp phỏng vấn báo chí' },
  { group: 'specialist', label: 'Thư ký họp', description: 'Biên bản cuộc họp chuyên nghiệp' },
  { group: 'officer', label: 'Thông tin vụ án', description: 'Ghi chép hồ sơ pháp lý' },
];

const LANGUAGES: { code: AudioLanguage; label: string }[] = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'Tiếng Anh' },
  { code: 'zh', label: 'Tiếng Trung' },
  { code: 'ko', label: 'Tiếng Hàn' },
  { code: 'ja', label: 'Tiếng Nhật' },
  { code: 'other', label: 'Ngôn ngữ khác' },
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileAudioIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MeetingLandingPage({ user, navigate, initialFiles }: Props) {
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  }, []);
  const [selectedLanguage, setSelectedLanguage] = useState<AudioLanguage | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowGroup | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleCards = (() => {
    const filtered = WORKFLOW_CARDS.filter((c) => user.workflowGroups?.includes(c.group));
    // Free users (no workflow groups assigned) get specialist by default
    if (filtered.length === 0 && user.role === 'free') {
      return WORKFLOW_CARDS.filter((c) => c.group === 'specialist');
    }
    return filtered;
  })();

  // Auto-select when only one workflow is available
  useEffect(() => {
    if (visibleCards.length === 1 && selectedWorkflow === null) {
      setSelectedWorkflow(visibleCards[0].group);
    }
  }, [visibleCards.length]);

  const canProceed = selectedLanguage !== null && selectedWorkflow !== null;

  const acceptedFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFileError(null);
    const newFiles: File[] = [];
    const errors: string[] = [];
    Array.from(fileList).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`${f.name} vượt quá 100MB`);
      } else {
        newFiles.push(f);
      }
    });
    if (errors.length > 0) setFileError(errors.join(', '));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    acceptedFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleProceed = () => {
    if (!canProceed) return;
    if (files.length > 0) {
      setPendingUpload(files, selectedLanguage!);
    } else {
      sessionStorage.setItem(SESSION_KEY_MEETING_LANGUAGE, selectedLanguage!);
    }
    navigate('/meeting/' + selectedWorkflow!);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center gap-4',
          'min-h-[200px] rounded-2xl border-2 border-dashed cursor-pointer',
          'transition-colors duration-150',
          dragActive
            ? 'border-[#1E40AF] bg-blue-50'
            : files.length > 0
            ? 'border-slate-300 bg-slate-50'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.ogg,.webm,.flac,.aac,.opus"
          className="hidden"
          onChange={(e) => acceptedFiles(e.target.files)}
        />

        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <UploadIcon className="w-10 h-10 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">Kéo thả hoặc nhấp để tải lên</p>
              <p className="text-xs text-slate-400 mt-0.5">MP3, MP4, WAV, M4A, FLAC... tối đa 100MB mỗi file</p>
            </div>
          </div>
        ) : (
          <div className="w-full px-6 py-2 space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <FileAudioIcon className="w-5 h-5 text-[#1E40AF] shrink-0" />
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-slate-400 shrink-0">{formatFileSize(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Xóa file ${f.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XIcon className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
            <p className="text-xs text-slate-400 text-center pt-1">Nhấp để thêm file</p>
          </div>
        )}

        {fileError && (
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-red-500 px-4">{fileError}</p>
        )}
      </div>


      {/* Workflow type selection — ẩn nếu chỉ có 1 lựa chọn (đã auto-select) */}
      {visibleCards.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <button
              key={card.group}
              type="button"
              onClick={() => setSelectedWorkflow(card.group)}
              className={[
                'flex flex-col gap-1.5 p-5 border rounded-xl text-left active:scale-[0.98] transition-all duration-150 cursor-pointer',
                selectedWorkflow === card.group
                  ? 'border-[#1E40AF] bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              ].join(' ')}
            >
              <span className={['text-base font-semibold', selectedWorkflow === card.group ? 'text-[#1E40AF]' : 'text-slate-800'].join(' ')}>{card.label}</span>
              <span className="text-xs text-slate-500 leading-relaxed">{card.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Language selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setSelectedLanguage(lang.code)}
            className={[
              'px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150',
              selectedLanguage === lang.code
                ? 'border-[#1E40AF] bg-[#1E40AF] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Nút thực hiện */}
      <button
        type="button"
        onClick={handleProceed}
        disabled={!canProceed}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-[#1E40AF] text-white hover:bg-[#1d3a9e] active:scale-[0.99] shadow-sm"
      >
        {!selectedLanguage
          ? (visibleCards.length > 1 && !selectedWorkflow
              ? 'Chọn tính năng và ngôn ngữ để tiếp tục'
              : 'Chọn ngôn ngữ để tiếp tục')
          : visibleCards.length > 1 && !selectedWorkflow
          ? 'Chọn tính năng để tiếp tục'
          : 'Thực hiện'}
      </button>

    </div>
  );
}
