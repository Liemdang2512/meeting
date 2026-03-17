import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import type { MindmapNode } from '../lib/mindmapSchema';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase, AlertTriangle, DollarSign, CheckCircle, Users, Target, Clock,
  FileText, Settings, Zap, Shield, TrendingUp, Map, List, MessageCircle,
  Calendar, Database, Lock, Star, Flag, Package, Wrench, Globe, Heart, Eye,
  BarChart, Layers, Link, Search, Upload, Circle,
} from 'lucide-react';

// ============================================================
// Branch color palette — one color per top-level branch
// ============================================================

const BRANCH_PALETTE = [
  { edge: '#c8607a', bg: '#fce8ed', border: '#dea0b0', text: '#7a1a3a' },
  { edge: '#7b5cb8', bg: '#f0e8ff', border: '#a890d8', text: '#3a1070' },
  { edge: '#3a84c0', bg: '#e4f0fa', border: '#78b0e0', text: '#1a3a6a' },
  { edge: '#2ea880', bg: '#e0f5ee', border: '#68c4a0', text: '#0a3a28' },
  { edge: '#c87030', bg: '#fef0e0', border: '#e0a860', text: '#6a3500' },
  { edge: '#b04848', bg: '#fde8e4', border: '#d08080', text: '#6a1010' },
  { edge: '#4878b8', bg: '#e8f0fc', border: '#80a8e0', text: '#18326a' },
];

// ============================================================
// Icon map — lucide-react icons keyed by whitelist string
// ============================================================

const ICON_MAP: Record<string, LucideIcon> = {
  'briefcase': Briefcase,
  'alert-triangle': AlertTriangle,
  'dollar-sign': DollarSign,
  'check-circle': CheckCircle,
  'users': Users,
  'target': Target,
  'clock': Clock,
  'file-text': FileText,
  'settings': Settings,
  'zap': Zap,
  'shield': Shield,
  'trending-up': TrendingUp,
  'map': Map,
  'list': List,
  'message-circle': MessageCircle,
  'calendar': Calendar,
  'database': Database,
  'lock': Lock,
  'star': Star,
  'flag': Flag,
  'package': Package,
  'tool': Wrench,
  'globe': Globe,
  'heart': Heart,
  'eye': Eye,
  'bar-chart': BarChart,
  'layers': Layers,
  'link': Link,
  'search': Search,
  'upload': Upload,
};

const DEFAULT_ICON: LucideIcon = Circle;

// ============================================================
// Node component
// ============================================================

interface MindmapNodeData {
  label: string;
  depth: number;
  side: 'left' | 'right' | 'center';
  colorIdx: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  iconKey?: string;
}

const hiddenHandle: React.CSSProperties = {
  visibility: 'hidden',
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
};

const MindmapNodeComponent: React.FC<NodeProps> = ({ id, data }) => {
  const d = data as unknown as MindmapNodeData;
  const isCenter = d.side === 'center';
  const isLeft = d.side === 'left';
  const palette = BRANCH_PALETTE[d.colorIdx % BRANCH_PALETTE.length];
  const IconComponent = !isCenter && d.iconKey
    ? (ICON_MAP[d.iconKey] ?? DEFAULT_ICON)
    : null;

  let style: React.CSSProperties;
  if (isCenter) {
    style = {
      background: '#1e2240',
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 700,
      borderRadius: 14,
      padding: '10px 22px',
      maxWidth: 260,
      boxShadow: '0 3px 10px rgba(0,0,0,0.22)',
      lineHeight: 1.5,
      textAlign: 'center',
      cursor: 'default',
      userSelect: 'none',
    };
  } else if (d.depth === 1) {
    style = {
      background: palette.bg,
      border: `1.5px solid ${palette.border}`,
      color: palette.text,
      fontSize: 12,
      fontWeight: 600,
      borderRadius: 20,
      padding: '6px 16px',
      maxWidth: 250,
      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      lineHeight: 1.4,
      cursor: d.hasChildren ? 'pointer' : 'default',
      userSelect: 'none',
    };
  } else {
    style = {
      background: '#ffffff',
      border: `1px solid ${palette.border}`,
      color: '#374151',
      fontSize: 11,
      fontWeight: 400,
      borderRadius: 8,
      padding: '4px 10px',
      maxWidth: 230,
      lineHeight: 1.4,
      cursor: d.hasChildren ? 'pointer' : 'default',
      userSelect: 'none',
    };
  }

  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', gap: 4, wordBreak: 'break-word', position: 'relative', overflow: 'hidden' }}
      onClick={() => d.hasChildren && d.onToggle(id)}
    >
      {/* Icon background — only for non-root nodes */}
      {IconComponent && (
        <div style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.15,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <IconComponent size={40} />
        </div>
      )}

      {/* ROOT: two source handles, one per side */}
      {isCenter && (
        <>
          <Handle id="src-left"  type="source" position={Position.Left}  style={hiddenHandle} />
          <Handle id="src-right" type="source" position={Position.Right} style={hiddenHandle} />
        </>
      )}

      {/* LEFT-side nodes: target on right, source on left */}
      {isLeft && !isCenter && (
        <>
          <Handle type="target" position={Position.Right} style={hiddenHandle} />
          <Handle type="source" position={Position.Left}  style={hiddenHandle} />
        </>
      )}

      {/* RIGHT-side nodes: target on left, source on right */}
      {!isLeft && !isCenter && (
        <>
          <Handle type="target" position={Position.Left}  style={hiddenHandle} />
          <Handle type="source" position={Position.Right} style={hiddenHandle} />
        </>
      )}

      <span style={{ flex: 1 }}>{d.label}</span>

      {d.hasChildren && !isCenter && (
        <span style={{ fontSize: 8, opacity: 0.45, flexShrink: 0, marginLeft: 2 }}>
          {d.expanded ? (isLeft ? '►' : '◄') : (isLeft ? '◄' : '►')}
        </span>
      )}
    </div>
  );
};

const nodeTypes = { mindmap: MindmapNodeComponent };

// ============================================================
// Layout — bidirectional (branches on both left and right)
// ============================================================

const NODE_HEIGHT = 36;
const NODE_V_GAP   = 16;
const H_SPACING    = 290;

function countLeaves(node: MindmapNode, collapsed: Set<string>): number {
  if (collapsed.has(node.id) || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c, collapsed), 0);
}

function subtreeHeight(node: MindmapNode, collapsed: Set<string>): number {
  const leaves = countLeaves(node, collapsed);
  return leaves * NODE_HEIGHT + (leaves - 1) * NODE_V_GAP;
}

function sideHeight(children: MindmapNode[], collapsed: Set<string>): number {
  if (children.length === 0) return 0;
  return children.reduce((s, c) => s + subtreeHeight(c, collapsed) + NODE_V_GAP, -NODE_V_GAP);
}

function buildBidirectionalLayout(
  tree: MindmapNode,
  collapsed: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  const children = collapsed.has(tree.id) ? [] : tree.children;
  const splitAt   = Math.ceil(children.length / 2);
  const rightKids = children.slice(0, splitAt);
  const leftKids  = children.slice(splitAt);

  const rightH = sideHeight(rightKids, collapsed);
  const leftH  = sideHeight(leftKids,  collapsed);
  const rootCY = Math.max(rightH, leftH, NODE_HEIGHT) / 2;

  // Root node
  rfNodes.push({
    id: tree.id,
    type: 'mindmap',
    position: { x: 0, y: rootCY - NODE_HEIGHT / 2 },
    data: {
      label:       tree.label,
      depth:       0,
      side:        'center',
      colorIdx:    0,
      hasChildren: children.length > 0,
      expanded:    !collapsed.has(tree.id),
      onToggle:    () => {},
    } as unknown as Record<string, unknown>,
  });

  function layoutSubtree(
    node:      MindmapNode,
    depth:     number,
    parentId:  string,
    startY:    number,
    side:      'left' | 'right',
    colorIdx:  number,
  ): void {
    const bh = subtreeHeight(node, collapsed);
    const cy = startY + bh / 2 - NODE_HEIGHT / 2;
    const x  = side === 'right' ? depth * H_SPACING : -(depth * H_SPACING);

    rfNodes.push({
      id: node.id,
      type: 'mindmap',
      position: { x, y: cy },
      data: {
        label:       node.label,
        depth,
        side,
        colorIdx,
        hasChildren: node.children.length > 0,
        expanded:    !collapsed.has(node.id),
        onToggle:    () => {},
        iconKey:     node.iconKey,
      } as unknown as Record<string, unknown>,
    });

    const palette = BRANCH_PALETTE[colorIdx % BRANCH_PALETTE.length];
    rfEdges.push({
      id:     `e-${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      // From root: pick the correct side handle
      ...(depth === 1 ? { sourceHandle: side === 'right' ? 'src-right' : 'src-left' } : {}),
      type:   'default', // bezier curve
      style:  { stroke: palette.edge, strokeWidth: 1.8 },
      // No arrow markers
      markerEnd: undefined,
    });

    if (!collapsed.has(node.id) && node.children.length > 0) {
      let childY = startY;
      node.children.forEach(child => {
        layoutSubtree(child, depth + 1, node.id, childY, side, colorIdx);
        const cl = countLeaves(child, collapsed);
        childY += cl * NODE_HEIGHT + (cl - 1) * NODE_V_GAP + NODE_V_GAP;
      });
    }
  }

  // Place right-side branches
  let rY = rootCY - rightH / 2;
  rightKids.forEach((child, i) => {
    layoutSubtree(child, 1, tree.id, rY, 'right', i);
    rY += subtreeHeight(child, collapsed) + NODE_V_GAP;
  });

  // Place left-side branches
  let lY = rootCY - leftH / 2;
  leftKids.forEach((child, i) => {
    layoutSubtree(child, 1, tree.id, lY, 'left', splitAt + i);
    lY += subtreeHeight(child, collapsed) + NODE_V_GAP;
  });

  return { nodes: rfNodes, edges: rfEdges };
}

// ============================================================
// Export buttons
// ============================================================

interface ExportButtonsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ containerRef }) => {
  const { fitView } = useReactFlow();
  const [busy, setBusy] = useState(false);

  const capture = useCallback(async (): Promise<string | null> => {
    fitView({ padding: 0.1, duration: 0 });
    await new Promise(r => setTimeout(r, 160));
    if (!containerRef.current) return null;
    return toPng(containerRef.current, {
      backgroundColor: '#ffffff',
      pixelRatio: 3,
      cacheBust: true,
    });
  }, [fitView, containerRef]);

  const handlePNG = useCallback(async () => {
    setBusy(true);
    try {
      const url = await capture();
      if (!url) return;
      const a = document.createElement('a');
      a.download = 'mindmap.png';
      a.href = url;
      a.click();
    } finally {
      setBusy(false);
    }
  }, [capture]);

  const handlePDF = useCallback(async () => {
    setBusy(true);
    try {
      const url = await capture();
      if (!url) return;
      const img = new Image();
      img.src = url;
      await new Promise(r => { img.onload = r; });
      const w = img.width;
      const h = img.height;
      const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
      pdf.addImage(url, 'PNG', 0, 0, w, h);
      pdf.save('mindmap.pdf');
    } finally {
      setBusy(false);
    }
  }, [capture]);

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 6 }}>
      {(['PNG', 'PDF'] as const).map(fmt => (
        <button
          key={fmt}
          onClick={fmt === 'PNG' ? handlePNG : handlePDF}
          disabled={busy}
          style={{
            fontSize: 12,
            padding: '5px 14px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: busy ? '#f3f4f6' : '#f9fafb',
            cursor: busy ? 'not-allowed' : 'pointer',
            color: '#374151',
            fontWeight: 500,
          }}
        >
          {busy ? '...' : `⬇ ${fmt}`}
        </button>
      ))}
    </div>
  );
};

// ============================================================
// Canvas inner
// ============================================================

interface MindmapCanvasProps {
  tree: MindmapNode;
}

const MindmapCanvasInner: React.FC<MindmapCanvasProps> = ({ tree }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { nodes: rawNodes, edges } = useMemo(
    () => buildBidirectionalLayout(tree, collapsed),
    [tree, collapsed],
  );

  const nodes = useMemo(
    () => rawNodes.map(n => ({
      ...n,
      data: { ...(n.data as object), onToggle: handleToggle } as unknown as Record<string, unknown>,
    })),
    [rawNodes, handleToggle],
  );

  const [rfNodes, , onNodesChange] = useNodesState(nodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(edges);

  const syncedNodes = useMemo(() => rfNodes.map(n => nodes.find(x => x.id === n.id) ?? n), [nodes, rfNodes]);
  const syncedEdges = useMemo(() => (rfEdges.length !== edges.length ? edges : rfEdges), [edges, rfEdges]);

  return (
    <div>
      <ExportButtons containerRef={containerRef} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 640,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#fafbfc',
        }}
      >
        <ReactFlow
          nodes={syncedNodes}
          edges={syncedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ markerEnd: undefined }}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({ tree }) => (
  <ReactFlowProvider>
    <MindmapCanvasInner tree={tree} />
  </ReactFlowProvider>
);
