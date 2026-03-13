import React, { useRef } from 'react';
import { MAX_SPLIT_FILE_SIZE_MB } from '../constants';

interface Props {
  file: File | null;
  fileSizeMB: number | null;
  error: string | null;
  onSelectFile: (file: File) => void;
}

export function FileSplitUploader({ file, fileSizeMB, error, onSelectFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelectFile(f);
  };

  return (
    <div className="space-y-3">
      <div
        className="border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:bg-slate-100 hover:border-slate-200 transition-all group rounded-2xl"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={handleChange}
        />
        <div className="text-4xl mb-4 group- transition-transform">🎵</div>
        <p className="text-slate-800 font-medium text-lg">Nhấn để chọn file audio hoặc video</p>
        <p className="text-slate-500 font-medium text-sm mt-2">Dung lượng tối đa cho Cắt file: {MAX_SPLIT_FILE_SIZE_MB}MB</p>
      </div>

      {file && (
        <div className="bg-slate-50 border-slate-200 p-4 flex items-center gap-4 shadow-sm rounded-xl border">
          <div className="text-3xl bg-white border-slate-200 p-2 shadow-sm rounded-xl border">📄</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 text-lg truncate">{file.name}</p>
            <p className="text-slate-500 font-medium text-sm mt-1">{fileSizeMB?.toFixed(2)} MB</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-white border-red-500 shadow-sm rounded-xl p-4 text-center">
          <p className="text-red-700 font-medium">⚠ {error}</p>
        </div>
      )}
    </div>
  );
}
