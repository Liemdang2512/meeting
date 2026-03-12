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
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={handleChange}
        />
        <div className="text-4xl mb-3">🎵</div>
        <p className="text-slate-600 font-medium">Nhấn để chọn file audio hoặc video</p>
        <p className="text-slate-400 text-sm mt-1">Dung lượng tối đa cho Cắt file: {MAX_SPLIT_FILE_SIZE_MB}MB</p>
      </div>

      {file && (
        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
          <div className="text-2xl">📄</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-slate-500 text-sm">{fileSizeMB?.toFixed(2)} MB</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
