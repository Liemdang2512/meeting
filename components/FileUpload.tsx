import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileAudioIcon, AlertCircleIcon } from './Icons';

interface FileUploadProps {
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onStartConvert: () => void;
  fileStatuses: ('idle' | 'processing' | 'done' | 'error')[]; // trạng thái từng file
  disabled: boolean;
  showStartButton?: boolean;
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
  showStartButton = true,
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
    <div className="w-full flex flex-col gap-4 min-h-0">
      {/* Drop Zone — ẩn khi đang xử lý */}
      {!isProcessing && (
        <div
          className={`relative w-full border transition-all duration-200 flex flex-col items-center justify-center p-6 text-center ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${dragActive ? 'border-slate-200 bg-slate-100' : error ? 'border-red-900 bg-white' : 'border-slate-200 bg-white border-dashed'} ${hasFiles ? 'h-32' : 'h-56'} ${!disabled && !dragActive && !error ? ' rounded-xl' : ''} `}
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
                <div className="p-3 bg-red-600 text-white mb-3 border-red-900 shadow-sm rounded-xl">
                  <AlertCircleIcon className="w-6 h-6" />
                </div>
                <p className="text-sm text-red-600 font-medium px-4">{error}</p>
                <p className="text-xs text-red-500 mt-2 font-medium">Nhấp để chọn file khác</p>
              </>
            ) : (
              <>
                <div className={`p-4 mb-4 border transition-colors ${dragActive ? 'bg-indigo-900 text-white border-slate-200 shadow-sm rounded-xl' : 'bg-white text-slate-800 border-slate-200 shadow-sm rounded-xl'}`}>
                  {dragActive ? <FileAudioIcon className="w-8 h-8" /> : <UploadCloudIcon className="w-8 h-8" />}
                </div>
                <p className="text-lg font-sans font-medium text-slate-800">
                  {dragActive ? 'Thả tệp vào đây' : hasFiles ? 'Kéo thả tiếp file' : 'Thả tệp hoặc click'}
                </p>
                {!hasFiles && <p className="text-slate-500 font-medium text-xs mt-2">MP3, WAV, M4A, OGG, MP4 · &le; 100MB</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Danh sách file */}
      {hasFiles && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <p className="text-sm font-medium text-slate-400">
            {isProcessing
              ? `Đang xử lý song song · ${doneCount}/${pendingFiles.length} file xong`
              : `${pendingFiles.length} file đã chọn`}
          </p>

          <div className="space-y-3 flex-1 min-h-0 overflow-auto pr-1">
            {pendingFiles.map((file, index) => {
              const status = getFileStatus(index);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center gap-4 p-4 border transition-all duration-300 ${status === 'done' ? 'bg-slate-50 border-slate-200 shadow-sm rounded-xl' : ''} ${status === 'processing' ? 'bg-white border-slate-200 shadow-sm rounded-xl' : ''} ${status === 'error' ? 'bg-white border-red-900 shadow-sm rounded-xl' : ''} ${status === 'idle' ? 'bg-white border-slate-200 rounded-xl' : ''} `}
                >
                  <div className="shrink-0">
                    {status === 'done' && <CheckCircleIcon className="w-6 h-6 text-slate-800" />}
                    {status === 'processing' && <InlineSpinner className="w-6 h-6 text-slate-800" />}
                    {status === 'error' && <AlertCircleIcon className="w-6 h-6 text-red-600" />}
                    {status === 'idle' && <FileAudioIcon className="w-6 h-6 text-slate-800" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium truncate ${status === 'error' ? 'text-red-600' : 'text-slate-800'}`}>
                      {file.name}
                    </p>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {formatSize(file.size)}
                    </p>
                  </div>

                  {status === 'idle' && (
                    <button
                      onClick={() => onRemoveFile(index)}
                      className="text-slate-800 hover:text-white hover:bg-red-600 p-2 border-transparent hover:border-red-900 rounded-xl transition-all shrink-0"
                      aria-label="Xóa file"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  )}
                  {status === 'processing' && (
                    <span className="text-sm font-medium text-slate-800 shrink-0 whitespace-nowrap">Đang xử lý</span>
                  )}
                  {status === 'done' && (
                    <span className="text-sm font-medium text-slate-800 shrink-0">Xong</span>
                  )}
                  {status === 'error' && (
                    <span className="text-sm font-medium text-red-600 shrink-0">Lỗi</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nút chuyển — chỉ hiện khi chưa xử lý */}
          {showStartButton && !isProcessing && (
            <button
              onClick={onStartConvert}
              disabled={disabled}
              className="w-full py-4 bg-indigo-600 border-slate-200 text-white font-sans font-medium text-xl shadow-sm rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto border"
            >
              {pendingFiles.length === 1 ? 'Chuyển văn bản' : `Chuyển ${pendingFiles.length} file`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
