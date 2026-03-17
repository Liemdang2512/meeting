import { z } from 'zod';

// ============================================================
// Mindmap schema — max 3 levels: center -> main branch -> sub-branch
// ============================================================

/** Level 3 node (leaf — no children) */
const Branch2Schema = z.object({
  label: z.string(),
  iconKey: z.string().optional(),
});

/** Level 2 node — can have leaf children */
const BranchSchema = z.object({
  label: z.string(),
  children: z.array(Branch2Schema).optional(),
  iconKey: z.string().optional(),
});

/** Level 1 root node */
const RootNodeSchema = z.object({
  label: z.string(),
  children: z.array(BranchSchema),
});

/** Top-level mindmap response from Gemini */
export const MindmapResponseSchema = z.object({
  root: RootNodeSchema,
});

export type Branch2 = z.infer<typeof Branch2Schema>;
export type Branch = z.infer<typeof BranchSchema>;
export type RootNode = z.infer<typeof RootNodeSchema>;
export type MindmapResponse = z.infer<typeof MindmapResponseSchema>;

// ============================================================
// Checklist schema — flat list with optional parent reference
// ============================================================

/** A single checklist item in Gemini's response (hierarchical) */
const ChecklistItemResponseSchema = z.object({
  label: z.string(),
  children: z.array(
    z.object({
      label: z.string(),
    })
  ).optional(),
});

/** Checklist response from Gemini */
export const ChecklistResponseSchema = z.object({
  items: z.array(ChecklistItemResponseSchema),
});

export type ChecklistItemResponse = z.infer<typeof ChecklistItemResponseSchema>;
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;

// ============================================================
// Internal MindmapNode type used by canvas/hooks
// ============================================================

export interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
  iconKey?: string;
}

/**
 * Convert Gemini mindmap response to internal MindmapNode tree.
 * Assigns string IDs if not provided.
 */
export function toMindmapTree(response: MindmapResponse): MindmapNode {
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  return {
    id: nextId('root'),
    label: response.root.label,
    children: (response.root.children ?? []).map((branch, bi) => ({
      id: nextId(`b${bi}`),
      label: branch.label,
      iconKey: branch.iconKey,
      children: (branch.children ?? []).map((sub, si) => ({
        id: nextId(`b${bi}s${si}`),
        label: sub.label,
        iconKey: sub.iconKey,
        children: [],
      })),
    })),
  };
}
