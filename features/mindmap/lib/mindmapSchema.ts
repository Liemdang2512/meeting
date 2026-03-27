import { z } from 'zod';

// ============================================================
// Shared icon enum — enforced at schema level so Gemini can't hallucinate
// ============================================================

const VALID_ICON_KEYS = [
  'briefcase', 'alert-triangle', 'dollar-sign', 'check-circle', 'users', 'target',
  'clock', 'file-text', 'settings', 'zap', 'shield', 'trending-up', 'map', 'list',
  'message-circle', 'calendar', 'database', 'lock', 'star', 'flag', 'package',
  'tool', 'globe', 'heart', 'eye', 'bar-chart', 'layers', 'link', 'search', 'upload',
] as const;

// Accepts any string but silently drops unknown icon keys — Gemini sometimes returns values not in the list
const IconKeySchema = z.string().optional().transform(val =>
  val && (VALID_ICON_KEYS as readonly string[]).includes(val) ? val : undefined
);

// ============================================================
// Mindmap schema — max 3 levels: center -> main branch -> sub-branch
// ============================================================

/** Level 3 node (leaf — no children) */
const Branch2Schema = z.object({
  label: z.string().max(80),
  iconKey: IconKeySchema,
});

/** Level 2 node — can have leaf children */
const BranchSchema = z.object({
  label: z.string().max(80),
  children: z.array(Branch2Schema).optional(),
  iconKey: IconKeySchema,
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

// ============================================================
// Diagram schema — visual infographic (hub-spoke + linear)
// ============================================================

/** A node in the visual diagram */
const DiagramNodeSchema = z.object({
  id: z.string().max(20),
  label: z.string().max(60),
  subtitle: z.string().max(40).optional(),
  description: z.string().max(120).optional(),
  iconKey: z.string().optional(),
  role: z.enum(['source', 'intermediate', 'destination', 'default']),
});

/** An edge connecting two diagram nodes */
const DiagramEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
});

/** Top-level diagram response from Gemini */
export const DiagramResponseSchema = z.object({
  title: z.string(),
  layoutType: z.enum(['hub-spoke', 'linear']),
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(DiagramEdgeSchema),
});

export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type DiagramResponse = z.infer<typeof DiagramResponseSchema>;
