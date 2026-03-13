import React from 'react';

interface Props {
  durationSeconds: number | null;
  chunkMinutes: number;
  segmentCount: number;
  onChangeChunkMinutes: (value: number) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FileSplitControls({ durationSeconds, chunkMinutes, segmentCount, onChangeChunkMinutes }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium text-slate-800">Số phút mỗi đoạn:</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={chunkMinutes}
            onChange={(e) => onChangeChunkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-4 py-2 border-slate-200 focus:border-slate-200 bg-white text-center font-medium text-lg focus:outline-none transition-colors border rounded-xl"
          />
          <span className="text-slate-500 font-medium text-sm">phút/đoạn</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 border-slate-200 p-4 text-center shadow-sm rounded-xl border">
          <p className="text-xs font-medium text-slate-500 mb-1">Tổng thời lượng</p>
          <p className="font-sans font-medium text-xl text-slate-800">
            {durationSeconds !== null ? formatDuration(durationSeconds) : '—'}
          </p>
        </div>
        <div className="bg-indigo-600 border-slate-200 p-4 text-center shadow-sm rounded-xl border">
          <p className="text-xs font-medium text-slate-800 mb-1">Số đoạn dự kiến</p>
          <p className="font-sans font-medium text-xl text-slate-800">
            {durationSeconds !== null ? segmentCount : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
