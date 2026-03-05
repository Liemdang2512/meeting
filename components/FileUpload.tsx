import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileAudioIcon, AlertCircleIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

// Limit increased to 200MB to support 1-2 hour high quality audio files
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndPassFile = (file: File) => {
    setError(null);

    // Check type
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac|mp4|m4p)$/i)) {
      setError("Vui lòng chỉ chọn tệp âm thanh/video (MP3, WAV, M4A, MP4, v.v.)");
      return;
    }

    // Check size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Tệp quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn hiện tại là 200MB (tương đương ~2 tiếng ghi âm chất lượng cao).`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out flex flex-col items-center justify-center p-6 text-center
          ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer hover:bg-slate-50'}
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleChange}
          accept="audio/*,video/mp4,.m4p"
          disabled={disabled}
        />

        <div className="flex flex-col items-center pointer-events-none">
          {error ? (
            <>
              <div className="p-3 rounded-full bg-red-100 text-red-500 mb-3">
                <AlertCircleIcon className="w-8 h-8" />
              </div>
              <p className="text-sm text-red-600 font-medium px-4">{error}</p>
            </>
          ) : (
            <>
              <div className={`p-4 rounded-full mb-3 ${dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {dragActive ? <FileAudioIcon className="w-8 h-8" /> : <UploadCloudIcon className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                {dragActive ? "Thả tệp âm thanh vào đây" : "Kéo & Thả hoặc Chọn tệp"}
              </h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Hỗ trợ MP3, WAV, M4A, OGG, MP4. Tối đa 200MB.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};