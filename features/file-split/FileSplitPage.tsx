import React from 'react';
import { useFileSplitter } from './hooks/useFileSplitter';
import { FileSplitUploader } from './components/FileSplitUploader';
import { FileSplitControls } from './components/FileSplitControls';
import { FileSplitResultList } from './components/FileSplitResultList';

export function FileSplitPage() {
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

  const isSplitting = status === 'splitting' || status === 'loading-ffmpeg';
  const canSplit = file !== null && !error && !isSplitting && durationSeconds !== null;

  const statusText = (() => {
    if (status === 'loading-ffmpeg') return 'Đang tải ffmpeg (lần đầu có thể hơi lâu)…';
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
          error={error}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* Controls section */}
      {file && !error && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <FileSplitControls
            durationSeconds={durationSeconds}
            chunkMinutes={chunkMinutes}
            segmentCount={segments.length}
            onChangeChunkMinutes={setChunkMinutes}
          />
        </div>
      )}

      {/* Action & progress section */}
      {file && !error && (
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

          {status === 'error' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Results section */}
      {status === 'done' && resultSegments.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <FileSplitResultList segments={resultSegments} />
          <button
            onClick={reset}
            className="mt-4 w-full py-2 border-2 border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cắt file khác
          </button>
        </div>
      )}
    </div>
  );
}
