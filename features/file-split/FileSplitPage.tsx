import React, { useEffect } from 'react';
import { useFileSplitter } from './hooks/useFileSplitter';
import { FileSplitUploader } from './components/FileSplitUploader';
import { FileSplitControls } from './components/FileSplitControls';
import { FileSplitResultList } from './components/FileSplitResultList';

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

  // Lỗi chọn file (size, duration) — khác với lỗi khi xử lý
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
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Cắt file Audio / Video</h2>
        <p className="text-slate-500 text-sm mt-1">
          Cắt file thành nhiều đoạn theo thời lượng. Xử lý hoàn toàn trên trình duyệt, không upload lên server.
        </p>
      </div>

      {/* Upload section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <FileSplitUploader
          file={file}
          fileSizeMB={fileSizeMB}
          error={fileSelectionError ? error : null}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* Controls section — chỉ ẩn khi lỗi chọn file */}
      {file && !fileSelectionError && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <FileSplitControls
            durationSeconds={durationSeconds}
            chunkMinutes={chunkMinutes}
            segmentCount={segments.length}
            onChangeChunkMinutes={setChunkMinutes}
          />
        </div>
      )}

      {/* Action, progress & error section */}
      {file && !fileSelectionError && (
        <div className="space-y-3">
          <button
            onClick={splitFile}
            disabled={!canSplit}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Cắt file
          </button>

          {statusText && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-blue-700 text-sm font-medium">{statusText}</p>
              {status === 'splitting' && progress.total > 0 && (
                <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Lỗi khi xử lý — luôn hiển thị */}
          {processingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm font-medium">❌ {error}</p>
              <button
                onClick={splitFile}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results section */}
      {status === 'done' && resultSegments.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <FileSplitResultList segments={resultSegments} />
          <div className="mt-4 flex gap-3">
            {onSendToTranscription && (
              <button
                onClick={() => {
                  const files = resultSegments
                    .filter((seg) => seg.blob)
                    .map((seg) => new File([seg.blob!], seg.name, { type: seg.blob!.type }));
                  onSendToTranscription(files);
                }}
                className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Chuyển sang văn bản
              </button>
            )}
            <button
              onClick={reset}
              className="flex-1 py-2 border-2 border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cắt file khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
