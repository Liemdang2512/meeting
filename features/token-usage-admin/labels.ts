import type { TokenUsageFeature, TokenUsageActionType } from '../../types';

/** Map feature code -> label tiếng Việt (hiển thị trong bảng/overview) */
export const FEATURE_LABELS: Record<TokenUsageFeature | 'unknown', string> = {
  minutes: 'Biên bản họp',
  'file-split': 'Cắt file',
  'token-usage-admin': 'Admin token',
  'my-token-usage': 'Token của tôi',
  mindmap: 'Mindmap & Checklist',
  other: 'Khác',
  unknown: 'Khác',
};

/** Map action_type -> label tiếng Việt */
export const ACTION_LABELS: Record<TokenUsageActionType, string> = {
  'minutes-generate': 'Tạo biên bản',
  'transcribe-basic': 'Phiên âm cơ bản',
  'transcribe-deep': 'Phiên âm chuyên sâu',
  'file-split-analyze': 'Phân tích cắt file',
  'admin-view': 'Xem admin',
  'my-usage-view': 'Xem token của tôi',
  'mindmap-generate': 'Tạo mindmap',
  'checklist-generate': 'Tạo checklist',
  'diagram-generate': 'Tạo sơ đồ',
  other: 'Khác',
};

export function getFeatureLabel(feature: string | undefined): string {
  if (!feature) return FEATURE_LABELS.unknown;
  return FEATURE_LABELS[feature as TokenUsageFeature] ?? feature;
}

export function getActionLabel(actionType: string | undefined): string {
  if (!actionType) return ACTION_LABELS.other;
  return ACTION_LABELS[actionType as TokenUsageActionType] ?? actionType;
}
