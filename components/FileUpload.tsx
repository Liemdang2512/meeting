import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileAudioIcon, AlertCircleIcon } from './Icons';

interface FileUploadProps {
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onStartConvert: () => void;
  fileStatuses: ('idle' | 'processing' | 'done' | 'error')[]; // trạng thái từng file
  disabled: boolean;
}

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InlineSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const FileUpload: React.FC<FileUploadProps> = ({
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  onStartConvert,
  fileStatuses,
  disabled,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProcessing = fileStatuses.some(s => s === 'processing');
  const hasFiles = pendingFiles.length > 0;
  const doneCount = fileStatuses.filter(s => s === 'done' || s === 'error').length;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const validateAndAdd = (incoming: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(incoming);

    for (const file of fileArray) {
      if (
        !file.type.startsWith('audio/') &&
        !file.type.startsWith('video/') &&
        !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac|mp4|m4p)$/i)
      ) {
        setError(`"${file.name}" không phải tệp âm thanh/video hỗ trợ.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn là 100MB.`);
        return;
      }
    }

    const existingNames = new Set(pendingFiles.map(f => f.name));
    const toAdd = fileArray.filter(f => !existingNames.has(f.name));
    if (toAdd.length > 0) onAddFiles(toAdd);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length > 0 && !disabled) validateAndAdd(e.dataTransfer.files);
    },
    [disabled, pendingFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) validateAndAdd(e.target.files);
    e.target.value = '';
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const getFileStatus = (index: number): 'idle' | 'done' | 'processing' | 'error' => {
    if (fileStatuses.length === 0 || !isProcessing) return 'idle';
    return fileStatuses[index] ?? 'idle';
  };

  return (
    <div className="w-full space-y-3">
      {/* Drop Zone — ẩn khi đang xử lý */}
      {!isProcessing && (
        <div
          className={`relative w-full border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center p-5 text-center
            ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer hover:bg-slate-50'}
            ${dragActive ? 'border-blue-500 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-slate-300'}
            ${hasFiles ? 'h-28' : 'h-48'}
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
            multiple
          />
          <div className="flex flex-col items-center pointer-events-none">
            {error ? (
              <>
                <div className="p-2 rounded-full bg-red-100 text-red-500 mb-2">
                  <AlertCircleIcon className="w-5 h-5" />
                </div>
                <p className="text-sm text-red-600 font-medium px-4">{error}</p>
                <p className="text-xs text-red-400 mt-0.5">Nhấp để chọn file khác</p>
              </>
            ) : (
              <>
                <div className={`p-3 rounded-full mb-2 ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {dragActive ? <FileAudioIcon className="w-6 h-6" /> : <UploadCloudIcon className="w-6 h-6" />}
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {dragActive ? 'Thả tệp vào đây' : hasFiles ? 'Kéo thả hoặc nhấp để thêm file tiếp' : 'Kéo & Thả hoặc Chọn tệp'}
                </p>
                {!hasFiles && <p className="text-slate-400 text-xs mt-0.5">MP3, WAV, M4A, OGG, MP4 · Tối đa 100MB/file</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Danh sách file */}
      {hasFiles && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider px-1 text-slate-400">
            {isProcessing
              ? `Đang xử lý song song · ${doneCount}/${pendingFiles.length} file xong`
              : `${pendingFiles.length} file đã chọn`}
          </p>

          <div className="space-y-1.5">
            {pendingFiles.map((file, index) => {
              const status = getFileStatus(index);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all duration-300
                    ${status === 'done' ? 'bg-green-50 border-green-200' : ''}
                    ${status === 'processing' ? 'bg-blue-50 border-blue-300 shadow-sm' : ''}
                    ${status === 'error' ? 'bg-red-50 border-red-200' : ''}
                    ${status === 'idle' ? 'bg-slate-50 border-slate-200' : ''}
                  `}
                >
                  <div className="shrink-0">
                    {status === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                    {status === 'processing' && <InlineSpinner className="w-4 h-4 text-blue-500" />}
                    {status === 'error' && <AlertCircleIcon className="w-4 h-4 text-red-400" />}
                    {status === 'idle' && <FileAudioIcon className="w-4 h-4 text-blue-300" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate
                      ${status === 'done' ? 'text-green-700' : ''}
                      ${status === 'processing' ? 'text-blue-700' : ''}
                      ${status === 'error' ? 'text-red-600' : ''}
                      ${status === 'idle' ? 'text-slate-700' : ''}
                    `}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                  </div>

                  {status === 'idle' && (
                    <button
                      onClick={() => onRemoveFile(index)}
                      className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                      aria-label="Xóa file"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                  {status === 'processing' && (
                    <span className="text-xs font-bold text-blue-500 shrink-0 whitespace-nowrap">Đang xử lý...</span>
                  )}
                  {status === 'done' && (
                    <span className="text-xs font-bold text-green-500 shrink-0">Xong</span>
                  )}
                  {status === 'error' && (
                    <span className="text-xs font-bold text-red-400 shrink-0">Lỗi</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nút chuyển — chỉ hiện khi chưa xử lý */}
          {!isProcessing && (
            <button
              onClick={onStartConvert}
              disabled={disabled}
              className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pendingFiles.length === 1 ? 'CHUYỂN SANG VĂN BẢN' : `CHUYỂN ${pendingFiles.length} FILE SANG VĂN BẢN`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
