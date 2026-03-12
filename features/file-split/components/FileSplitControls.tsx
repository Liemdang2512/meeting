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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Số phút mỗi đoạn:</label>
        <input
          type="number"
          min={1}
          value={chunkMinutes}
          onChange={(e) => onChangeChunkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-24 px-3 py-2 border-2 border-slate-200 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <span className="text-slate-500 text-sm">phút/đoạn</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Tổng thời lượng</p>
          <p className="font-bold text-slate-800">
            {durationSeconds !== null ? formatDuration(durationSeconds) : '—'}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Số đoạn dự kiến</p>
          <p className="font-bold text-blue-700">
            {durationSeconds !== null ? segmentCount : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
