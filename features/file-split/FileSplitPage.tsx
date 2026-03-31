import React from 'react';
import { useFileSplitter } from './hooks/useFileSplitter';
import { FileSplitUploader } from './components/FileSplitUploader';
import { FileSplitControls } from './components/FileSplitControls';
import { FileSplitResultList } from './components/FileSplitResultList';
import {
  UploadCloud,
  FileEdit,
  Info,
  FileText,
  CheckCircle,
  Music,
  Timer,
  HardDrive,
  Sparkles,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { icon: UploadCloud, label: 'Tải lên file' },
  { icon: FileEdit, label: 'Ghi chép' },
  { icon: Info, label: 'Thông tin cuộc họp' },
  { icon: FileText, label: 'Biên bản' },
  { icon: CheckCircle, label: 'Hoàn thành' },
];

interface Props {
  onSendToTranscription?: (files: File[]) => void;
}


export function FileSplitPage({ onSendToTranscription }: Props) {
  const {
    file,
    fileSizeMB,
    durationSeconds,
    chunkMinutes,
    segments,
    status,
    progress,
    error,
    resultSegments,
    onSelectFile,
    setChunkMinutes,
    splitFile,
    reset,
  } = useFileSplitter();

  const fileSelectionError = error && status !== 'error';
  const processingError = error && status === 'error';

  const isBusy = status === 'splitting' || status === 'loading-ffmpeg';
  const canSplit = file !== null && !fileSelectionError && !isBusy && durationSeconds !== null;

  const statusText = (() => {
    if (status === 'loading-ffmpeg') return 'Đang giải mã file audio…';
    if (status === 'splitting') {
      if (progress.total > 0) return `Đang cắt đoạn ${progress.current}/${progress.total}…`;
      return 'Đang cắt file…';
    }
    return null;
  })();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-8 space-y-10 font-body text-on-surface animate-in fade-in duration-300">


      {/* Step Progress Indicator — chỉ hiện khi chưa chọn file */}
      {!file && (
        <div className="mb-4">
          <div className="relative flex justify-between items-center max-w-3xl mx-auto">
            <div className="absolute top-5 left-0 w-full h-1 bg-surface-container-highest -z-10 rounded-full" />
            <div className="absolute top-5 left-0 w-[12.5%] h-1 nebula-gradient -z-10 rounded-full transition-all duration-500" />
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === 0;
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white shadow-md transition-all ${isActive ? 'nebula-gradient text-white' : 'bg-surface-container-highest text-outline'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold whitespace-nowrap ${isActive ? 'text-primary' : 'text-outline font-medium'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight">
          Cắt file Audio / Video
        </h2>
        <p className="text-on-surface-variant text-sm font-medium">
          Cắt file thành nhiều đoạn theo thời lượng. Xử lý hoàn toàn trên trình duyệt, không upload lên server.
        </p>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Large Upload Area (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Upload Drop Zone */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 nebula-gradient opacity-10 blur group-hover:opacity-20 transition duration-500 rounded-[2rem]" />
            <div className="relative bg-surface-container-lowest rounded-[2rem] border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all duration-300 overflow-hidden">
              <FileSplitUploader
                file={file}
                fileSizeMB={fileSizeMB}
                error={fileSelectionError ? error : null}
                onSelectFile={onSelectFile}
              />
            </div>
          </div>

          {/* File Constraints Badges */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-on-surface-variant">Lên đến 180 phút</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-on-surface-variant">Tối đa 500MB</span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-on-surface-variant">Định dạng HD &amp; HQ</span>
            </div>
          </div>

          {/* Controls — only when file selected and no file error */}
          {file && !fileSelectionError && (
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] border border-outline-variant/20">
              <FileSplitControls
                durationSeconds={durationSeconds}
                chunkMinutes={chunkMinutes}
                segmentCount={segments.length}
                onChangeChunkMinutes={setChunkMinutes}
              />
            </div>
          )}

          {/* Action + Progress + Error */}
          {file && !fileSelectionError && (
            <div className="space-y-4">
              <button
                onClick={splitFile}
                disabled={!canSplit}
                className="w-full nebula-gradient py-4 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isBusy ? 'Đang xử lý...' : 'Cắt file'}
              </button>

              {statusText && (
                <div className="bg-surface-container-low p-4 rounded-2xl text-center">
                  <p className="text-on-surface font-medium mb-3">{statusText}</p>
                  {status === 'splitting' && progress.total > 0 && (
                    <div className="bg-surface-container-highest h-3 w-full rounded-full overflow-hidden">
                      <div
                        className="nebula-gradient h-full transition-all duration-300 rounded-full"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {processingError && (
                <div className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-error font-medium">{error}</p>
                    <button
                      onClick={splitFile}
                      className="mt-2 text-sm text-error underline decoration-2 hover:opacity-80 font-semibold"
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Section */}
          {status === 'done' && resultSegments.length > 0 && (
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] border border-outline-variant/20">
              <FileSplitResultList segments={resultSegments} />
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                {onSendToTranscription && (
                  <button
                    onClick={() => {
                      const files = resultSegments
                        .filter((seg) => seg.blob)
                        .map((seg) => new File([seg.blob!], seg.name, { type: seg.blob!.type }));
                      onSendToTranscription(files);
                    }}
                    className="flex-1 nebula-gradient py-3 rounded-full text-white font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center"
                  >
                    Chuyển sang văn bản
                  </button>
                )}
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-full bg-surface-container-low text-on-surface font-semibold hover:bg-surface-container-highest border border-outline-variant/20 transition-all active:scale-[0.98]"
                >
                  Cắt file khác
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Info Panel (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Guide */}
          <div className="bg-surface-container-low p-6 rounded-[2rem]">
            <h4 className="font-headline font-bold text-lg mb-4 text-on-surface">Hướng dẫn nhanh</h4>
            <ul className="space-y-4">
              {[
                'Tải tệp tin của bạn lên hệ thống MoMai AI.',
                'Sử dụng thanh trượt để chọn đoạn cần cắt.',
                'Lưu lại đoạn đã cắt và tiến hành ghi chép AI.',
              ].map((text, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-on-surface-variant">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Tip Card */}
          <div className="p-6 rounded-[2rem] border border-outline-variant/20 bg-surface-container-low relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h4 className="font-headline font-bold text-lg text-on-surface">Mẹo nhỏ</h4>
              </div>
              <p className="text-sm text-on-surface-variant">
                Bạn có thể cắt nhiều đoạn từ một file gốc để tạo thành các biên bản cuộc họp riêng biệt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
