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

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-slate-800">Kết quả ({segments.length} đoạn)</h3>
      {segments.map((seg) => (
        <div key={seg.index} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {seg.index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 text-sm truncate">{seg.name}</p>
            <p className="text-slate-500 text-xs">{formatDuration(seg.duration)}</p>
          </div>
          <button
            onClick={() => handleDownload(seg)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            Tải xuống
          </button>
        </div>
      ))}
    </div>
  );
}
