import { authFetch, getToken } from '../lib/api';
import type {
  TokenLoggingContext,
  TokenUsageFeature,
  TokenUsageActionType,
  TokenUsageMetadata,
} from '../types';

export interface LogTokenUsageParams {
  userId: string;
  feature: TokenUsageFeature;
  actionType: TokenUsageActionType;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  metadata?: TokenUsageMetadata;
}

const mapLoggingContextToMetadata = (
  context: TokenLoggingContext | undefined,
): TokenUsageMetadata | undefined => {
  if (!context?.metadata) return undefined;
  return context.metadata;
};

export const logTokenUsage = async (params: LogTokenUsageParams): Promise<void> => {
  if (!getToken()) return; // khong log neu chua dang nhap

  const payload = {
    user_id: params.userId,       // server se ignore, dung userId tu JWT
    feature: params.feature,
    action_type: params.actionType,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.totalTokens,
    metadata: params.metadata ?? mapLoggingContextToMetadata(undefined) ?? null,
  };

  try {
    const res = await authFetch('/token-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('Failed to log token usage', await res.text());
    }
  } catch (error) {
    console.warn('Unexpected error while logging token usage', error);
  }
};
