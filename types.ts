
export enum TranscriptionStatus {
  IDLE = 'IDLE',
  READING_FILE = 'READING_FILE',
  PROCESSING = 'PROCESSING',
  SYNTHESIZING = 'SYNTHESIZING',
  SYNTHESIZED = 'SYNTHESIZED',
  COMPLETED = 'COMPLETED',
  SUMMARIZING = 'SUMMARIZING',
  ERROR = 'ERROR',
}

export interface TranscriptionResult {
  text: string;
  timestamp: string;
  fileName: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}
