import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MindmapNode } from '../lib/mindmapSchema';

// ============================================================
// Custom mindmap node
// ============================================================

interface MindmapNodeData {
  label: string;
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
  onToggle: (id: string) => void;
}

const NODE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: '#4f46e5', border: '#3730a3', text: '#ffffff' },  // root — indigo
  1: { bg: '#0ea5e9', border: '#0284c7', text: '#ffffff' },  // branch — sky
  2: { bg: '#f1f5f9', border: '#cbd5e1', text: '#1e293b' },  // leaf — slate
};

function getNodeColor(depth: number) {
  return NODE_COLORS[depth] ?? NODE_COLORS[2];
}

const MindmapNodeComponent: React.FC<NodeProps> = ({ id, data }) => {
  const d = data as unknown as MindmapNodeData;
  const colors = getNodeColor(d.depth);

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 10,
        padding: '8px 14px',
        minWidth: 100,
        maxWidth: 200,
        fontSize: d.depth === 0 ? 15 : 13,
        fontWeight: d.depth === 0 ? 700 : 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: d.hasChildren ? 'pointer' : 'default',
      }}
      onClick={() => d.hasChildren && d.onToggle(id)}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>{d.label}</span>
      {d.hasChildren && (
        <span
          style={{
            fontSize: 11,
            opacity: 0.8,
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          {d.expanded ? '▾' : '▸'}
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
};

const nodeTypes = { mindmap: MindmapNodeComponent };

// ============================================================
// Tree → nodes + edges layout
// ============================================================

const H_SPACING = 250;
const V_SPACING = 60;

interface LayoutNode {
  id: string;
  label: string;
  depth: number;
  parent?: string;
  children: string[];
}

function flattenTree(
  node: MindmapNode,
  depth: number,
  parent: string | undefined,
  result: LayoutNode[]
) {
  result.push({
    id: node.id,
    label: node.label,
    depth,
    parent,
    children: node.children.map(c => c.id),
  });
  node.children.forEach(child => flattenTree(child, depth + 1, node.id, result));
}

function buildLayout(
  tree: MindmapNode,
  collapsed: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const flat: LayoutNode[] = [];
  flattenTree(tree, 0, undefined, flat);

  const byId = new Map(flat.map(n => [n.id, n]));

  // Determine visible nodes
  const visible = new Set<string>();
  function visit(id: string) {
    visible.add(id);
    const node = byId.get(id);
    if (node && !collapsed.has(id)) {
      node.children.forEach(c => visit(c));
    }
  }
  visit(tree.id);

  const visibleNodes = flat.filter(n => visible.has(n.id));

  // Position: x = depth * H_SPACING; y = index * V_SPACING within same parent
  const yByParent = new Map<string | undefined, number>();
  const positions = new Map<string, { x: number; y: number }>();

  visibleNodes.forEach(n => {
    const key = n.parent;
    const currentY = yByParent.get(key) ?? 0;
    positions.set(n.id, { x: n.depth * H_SPACING, y: currentY });
    yByParent.set(key, currentY + V_SPACING);
  });

  const nodes: Node[] = visibleNodes.map(n => ({
    id: n.id,
    type: 'mindmap',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: n.label,
      hasChildren: n.children.length > 0,
      expanded: !collapsed.has(n.id),
      depth: n.depth,
      onToggle: () => {},  // Will be replaced by callback
    } as unknown as Record<string, unknown>,
  }));

  const edges: Edge[] = visibleNodes
    .filter(n => n.parent && visible.has(n.parent))
    .map(n => ({
      id: `e-${n.parent}-${n.id}`,
      source: n.parent!,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      animated: false,
    }));

  return { nodes, edges };
}

// ============================================================
// Main canvas component
// ============================================================

interface MindmapCanvasProps {
  tree: MindmapNode;
}

const MindmapCanvasInner: React.FC<MindmapCanvasProps> = ({ tree }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const { nodes: rawNodes, edges } = useMemo(
    () => buildLayout(tree, collapsed),
    [tree, collapsed]
  );

  // Inject the toggle callback into each node's data
  const nodes = useMemo(
    () => rawNodes.map(n => ({
      ...n,
      data: {
        ...(n.data as object),
        onToggle: handleToggle,
      } as unknown as Record<string, unknown>,
    })),
    [rawNodes, handleToggle]
  );

  const [rfNodes, , onNodesChange] = useNodesState(nodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(edges);

  // Sync external state to ReactFlow nodes/edges
  const syncedNodes = useMemo(
    () => rfNodes.map(n => {
      const updated = nodes.find(x => x.id === n.id);
      return updated ?? n;
    }),
    [nodes, rfNodes]
  );

  const syncedEdges = useMemo(
    () => rfEdges.length !== edges.length ? edges : rfEdges,
    [edges, rfEdges]
  );

  return (
    <div style={{ width: '100%', height: 520, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
      <ReactFlow
        nodes={syncedNodes}
        edges={syncedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background color="#e2e8f0" gap={24} />
      </ReactFlow>
    </div>
  );
};

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({ tree }) => (
  <ReactFlowProvider>
    <MindmapCanvasInner tree={tree} />
  </ReactFlowProvider>
);
