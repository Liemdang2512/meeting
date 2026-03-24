export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export const WORKFLOW_GROUPS: readonly { key: WorkflowGroup; label: string; description: string }[] = [
  { key: 'reporter', label: 'Phong vien', description: 'Bao chi - Truyen thong' },
  { key: 'specialist', label: 'Chuyen vien', description: 'Doanh nghiep - To chuc' },
  { key: 'officer', label: 'Can bo', description: 'Phap ly - Hanh chinh' },
] as const;

export const VALID_WORKFLOW_GROUPS: readonly WorkflowGroup[] = ['reporter', 'specialist', 'officer'] as const;

export const DEFAULT_WORKFLOW_GROUP: WorkflowGroup = 'specialist';
