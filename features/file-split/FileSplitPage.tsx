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
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-sans font-medium text-slate-800">Cắt file Audio / Video</h2>
        <p className="text-slate-500 font-medium text-sm mt-2">
          Cắt file thành nhiều đoạn theo thời lượng. Xử lý hoàn toàn trên trình duyệt, không upload lên server.
        </p>
      </div>

      {/* Upload section */}
      <div className="bg-white p-6 md:p-8 border-slate-200 shadow-sm rounded-xl border">
        <FileSplitUploader
          file={file}
          fileSizeMB={fileSizeMB}
          error={fileSelectionError ? error : null}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* Controls section — chỉ ẩn khi lỗi chọn file */}
      {file && !fileSelectionError && (
        <div className="bg-white p-6 md:p-8 border-slate-200 shadow-sm rounded-xl border">
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
        <div className="space-y-4">
          <button
            onClick={splitFile}
            disabled={!canSplit}
            className="w-full py-4 bg-indigo-600 text-white font-sans font-medium text-lg border-slate-200 shadow-sm rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
          >
            CẮT FILE
          </button>

          {statusText && (
            <div className="bg-slate-50 border-slate-200 p-4 font-medium text-center shadow-sm rounded-xl border">
              <p className="text-slate-800 mb-2">{statusText}</p>
              {status === 'splitting' && progress.total > 0 && (
                <div className="bg-white border-slate-200 h-4 w-full border rounded-2xl">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300 border-r-2 border-slate-200 rounded-2xl"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Lỗi khi xử lý — luôn hiển thị */}
          {processingError && (
            <div className="bg-white border-red-500 shadow-sm rounded-xl p-4 font-medium">
              <p className="text-red-700">❌ {error}</p>
              <button
                onClick={splitFile}
                className="mt-2 text-sm text-red-700 underline decoration-red-500 decoration-2 hover:text-red-900"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results section */}
      {status === 'done' && resultSegments.length > 0 && (
        <div className="bg-white p-6 md:p-8 border-slate-200 shadow-sm rounded-xl border">
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
                className="flex-1 py-3 bg-indigo-600 text-white font-medium border-slate-200 shadow-sm rounded-xl hover:bg-indigo-700 transition-all flex justify-center border"
              >
                Chuyển sang văn bản
              </button>
            )}
            <button
              onClick={reset}
              className="flex-1 py-3 border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-100 shadow-sm rounded-xl transition-all border"
            >
              Cắt file khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
