export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export const WORKFLOW_GROUPS: readonly { key: WorkflowGroup; label: string; description: string }[] = [
  { key: 'reporter', label: 'Phóng viên', description: 'Báo chí - Truyền thông' },
  { key: 'specialist', label: 'Chuyên viên', description: 'Doanh nghiệp - Tổ chức' },
  { key: 'officer', label: 'Cán bộ', description: 'Pháp lý - Hành chính' },
] as const;

export const VALID_WORKFLOW_GROUPS: readonly WorkflowGroup[] = ['reporter', 'specialist', 'officer'] as const;

export const DEFAULT_WORKFLOW_GROUP: WorkflowGroup = 'specialist';
