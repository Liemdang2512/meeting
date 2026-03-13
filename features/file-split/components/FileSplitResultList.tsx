import React from 'react';
import { SplitSegment } from '../types';

interface Props {
  segments: SplitSegment[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FileSplitResultList({ segments }: Props) {
  const handleDownload = (seg: SplitSegment) => {
    if (!seg.blob) return;
    const url = URL.createObjectURL(seg.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = seg.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    segments.forEach((seg, i) => {
      if (!seg.blob) return;
      setTimeout(() => handleDownload(seg), i * 300);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-sans font-medium text-lg text-slate-800">Kết quả ({segments.length} đoạn)</h3>
        <button
          onClick={handleDownloadAll}
          className="px-4 py-2 bg-indigo-900 text-white text-sm font-medium border-transparent hover:border-slate-200 transition-colors rounded-xl"
        >
          Tải tất cả
        </button>
      </div>
      <div className="space-y-3">
        {segments.map((seg) => (
          <div key={seg.index} className="flex items-center gap-4 bg-slate-50 border-slate-200 p-4 transition-colors hover:bg-white rounded-xl border">
            <div className="w-10 h-10 bg-white border-slate-200 flex items-center justify-center text-slate-800 font-sans font-medium text-lg shrink-0 border rounded-2xl">
              {seg.index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-base truncate">{seg.name}</p>
              <p className="text-slate-500 text-sm font-medium">{formatDuration(seg.duration)}</p>
            </div>
            <button
              onClick={() => handleDownload(seg)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium border-slate-200 shadow-sm rounded-xl hover:bg-indigo-700 transition-all shrink-0 border"
            >
              Tải xuống
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
