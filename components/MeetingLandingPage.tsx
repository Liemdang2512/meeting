import React, { useState, useCallback, useRef, useEffect } from 'react';
import { setPendingUpload } from '../features/workflows/shared/fileStore';
import { SESSION_KEY_MEETING_LANGUAGE } from '../features/workflows/shared/sessionKeys';
import {
  Upload,
  FileAudio,
  X,
  CheckCircle2,
  Search,
  Check,
  ArrowRight,
  Mic,
  Users,
  FileText,
} from 'lucide-react';

type WorkflowGroup = 'reporter' | 'specialist' | 'officer';
type AudioLanguage = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'other';

interface MeetingLandingUser {
  userId: string;
  email: string;
  role: string;
  plans?: string[];
}

interface Props {
  user: MeetingLandingUser;
  navigate: (path: string) => void;
  initialFiles?: File[];
}

const WORKFLOW_CARDS: {
  group: WorkflowGroup;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    group: 'reporter',
    label: 'Bài phỏng vấn',
    description: 'Ghi chép & tổng hợp phỏng vấn báo chí',
    icon: <Mic size={20} />,
    accent: 'bg-indigo-50 text-indigo-600',
  },
  {
    group: 'specialist',
    label: 'Thư ký Cuộc họp',
    description: 'Biên bản cuộc họp chuyên nghiệp',
    icon: <Users size={20} />,
    accent: 'bg-primary text-white',
  },
  {
    group: 'officer',
    label: 'Thông tin Dự án',
    description: 'Ghi chép hồ sơ pháp lý',
    icon: <FileText size={20} />,
    accent: 'bg-purple-50 text-purple-600',
  },
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
  const [langSearch, setLangSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleCards = (() => {
    const filtered = user.role === 'admin'
      ? WORKFLOW_CARDS
      : WORKFLOW_CARDS.filter((c) => user.plans?.includes(c.group));
    if (filtered.length === 0 && user.role === 'free') {
      return WORKFLOW_CARDS.filter((c) => c.group === 'specialist');
    }
    return filtered;
  })();

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

  const filteredLanguages = LANGUAGES.filter((l) =>
    l.label.toLowerCase().includes(langSearch.toLowerCase())
  );

  const proceedLabel = !selectedLanguage
    ? visibleCards.length > 1 && !selectedWorkflow
      ? 'Chọn tính năng và ngôn ngữ để tiếp tục'
      : 'Chọn ngôn ngữ để tiếp tục'
    : visibleCards.length > 1 && !selectedWorkflow
    ? 'Chọn tính năng để tiếp tục'
    : 'Thực hiện';

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      {/* Hero / Upload section */}
      <section className="mt-6 mb-10 px-6 max-w-4xl mx-auto w-full">
        <div className="mb-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline mb-3 tracking-tight text-on-surface">
            Tải lên &amp;{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Xử lý AI
            </span>
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-base leading-relaxed">
            Tải lên bản ghi của bạn và để MoMai chuyển đổi âm thanh thô thành biên bản cuộc họp có
            cấu trúc.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="relative group">
          {/* Decorative glow */}
          <div className="absolute -inset-1 nebula-gradient rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={[
              'relative bg-surface-container-lowest border-2 border-dashed rounded-[2rem] p-10 text-center',
              'transition-all duration-300 cursor-pointer',
              dragActive
                ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                : files.length > 0
                ? 'border-outline-variant/50 hover:border-primary/50'
                : 'border-outline-variant/30 hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/5',
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
              <>
                <div className="mb-5 flex justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                    <Upload size={36} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">
                  Trung tâm Tải tệp
                </h3>
                <p className="text-on-surface-variant mb-7">
                  Kéo và thả tệp âm thanh hoặc video của bạn vào đây
                  <br />
                  <span className="text-xs font-medium tracking-wide opacity-70">
                    MP3, MP4, WAV, FLAC • TỐI ĐA 100MB
                  </span>
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    type="button"
                    className="px-8 py-4 nebula-gradient text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Chọn Tệp
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3"
                  >
                    <FileAudio size={18} className="text-primary shrink-0" />
                    <span className="text-sm font-medium text-on-surface flex-1 truncate">
                      {f.name}
                    </span>
                    <span className="text-xs text-on-surface-variant shrink-0">
                      {formatFileSize(f.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Xóa file ${f.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="p-1.5 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
                    >
                      <X size={14} className="text-on-surface-variant" />
                    </button>
                  </div>
                ))}
                <p
                  className="text-xs text-on-surface-variant text-center pt-2 cursor-pointer"
                  onClick={() => inputRef.current?.click()}
                >
                  Nhấp để thêm file
                </p>
              </div>
            )}

            {fileError && (
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-error px-4">
                {fileError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Feature & Language selection */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 px-6 max-w-4xl mx-auto w-full">
        {/* Feature Cards */}
        {visibleCards.length > 1 && (
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold font-headline text-on-surface">1. Chọn Tính năng</h4>
              <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                Bắt buộc
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {visibleCards.map((card) => {
                const isSelected = selectedWorkflow === card.group;
                return (
                  <button
                    key={card.group}
                    type="button"
                    onClick={() => setSelectedWorkflow(card.group)}
                    className={[
                      'group cursor-pointer bg-surface-container-lowest p-6 rounded-[1.5rem] text-left',
                      'shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1',
                      'relative overflow-hidden',
                      isSelected
                        ? 'border-2 border-primary/40 ring-4 ring-primary/5'
                        : 'border border-transparent hover:border-primary/20',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                        isSelected ? 'bg-primary text-white' : card.accent,
                      ].join(' ')}
                    >
                      {card.icon}
                    </div>
                    <h5 className="font-bold text-base mb-1.5 text-on-surface">{card.label}</h5>
                    <p className="text-sm text-on-surface-variant">{card.description}</p>
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-primary">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                    <div
                      className={[
                        'absolute bottom-0 left-0 w-full h-1 bg-primary transition-transform origin-left',
                        isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                      ].join(' ')}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language Selection */}
        <div
          className={[
            'flex flex-col',
            visibleCards.length > 1 ? 'lg:col-span-4' : 'lg:col-span-12',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold font-headline text-on-surface">
              {visibleCards.length > 1 ? '2.' : '1.'} Ngôn ngữ
            </h4>
          </div>
          <div className="bg-surface-container-low rounded-[1.5rem] p-5 flex-1 flex flex-col">
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest rounded-xl border-none text-sm focus:ring-2 focus:ring-primary/20 shadow-sm text-on-surface placeholder-on-surface-variant/50"
                placeholder="Tìm kiếm ngôn ngữ..."
              />
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-surface-container-lowest text-primary shadow-sm border border-primary/10 font-semibold'
                        : 'hover:bg-surface-container-lowest/60 text-on-surface-variant',
                    ].join(' ')}
                  >
                    <span>{lang.label}</span>
                    {isSelected && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-auto px-6 pb-10 max-w-4xl mx-auto w-full">
        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 nebula-gradient rounded-full opacity-40 animate-ping" />
              <div className="relative w-4 h-4 nebula-gradient rounded-full" />
            </div>
            <p className="text-on-surface-variant font-medium text-sm">
              Sẵn sàng xử lý? Vui lòng xem lại các lựa chọn của bạn ở trên.
            </p>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed}
            className={[
              'w-full md:w-auto px-10 py-4 rounded-full font-extrabold text-base shadow-2xl',
              'flex items-center justify-center gap-3 transition-all group',
              canProceed
                ? 'nebula-gradient text-white shadow-primary/40 hover:scale-[1.02] active:scale-95'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60',
            ].join(' ')}
          >
            <span>{proceedLabel}</span>
            <ArrowRight
              size={18}
              className={canProceed ? 'group-hover:translate-x-1 transition-transform' : ''}
            />
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(78,69,228,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(78,69,228,0.3); }
      `}</style>
    </div>
  );
}
