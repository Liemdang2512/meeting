
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

export type TokenUsageFeature =
  | 'minutes'
  | 'file-split'
  | 'token-usage-admin'
  | 'my-token-usage'
  | 'mindmap'
  | 'other';

export type TokenUsageActionType =
  | 'minutes-generate'
  | 'transcribe-basic'
  | 'transcribe-deep'
  | 'file-split-analyze'
  | 'admin-view'
  | 'my-usage-view'
  | 'mindmap-generate'
  | 'checklist-generate'
  | 'other';

export type TokenUsageMetadataValue = string | number | boolean | null;

export type TokenUsageMetadata = Record<string, TokenUsageMetadataValue>;

export interface TokenUsageLog {
  id: string;
  userId: string;
  userEmail: string | null;
  createdAt: string;
  feature: TokenUsageFeature;
  actionType: TokenUsageActionType;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  model: string;
  metadata: TokenUsageMetadata | null;
}

export interface TokenLoggingContext {
  feature: TokenUsageFeature;
  actionType: TokenUsageActionType;
  metadata?: TokenUsageMetadata;
}
