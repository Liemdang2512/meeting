import type { AudioLanguage } from '../../../services/geminiService';

interface PendingUpload {
  files: File[];
  language: AudioLanguage;
}

let _pending: PendingUpload | null = null;

export function setPendingUpload(files: File[], language: AudioLanguage): void {
  _pending = { files, language };
}

export function takePendingUpload(): PendingUpload | null {
  const val = _pending;
  _pending = null;
  return val;
}
