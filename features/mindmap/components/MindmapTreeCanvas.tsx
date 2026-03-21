import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
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

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  'briefcase': Briefcase, 'alert-triangle': AlertTriangle, 'dollar-sign': DollarSign,
  'check-circle': CheckCircle, 'users': Users, 'target': Target, 'clock': Clock,
  'file-text': FileText, 'settings': Settings, 'zap': Zap, 'shield': Shield,
  'trending-up': TrendingUp, 'map': Map, 'list': List, 'message-circle': MessageCircle,
  'calendar': Calendar, 'database': Database, 'lock': Lock, 'star': Star,
  'flag': Flag, 'package': Package, 'tool': Wrench, 'globe': Globe, 'heart': Heart,
  'eye': Eye, 'bar-chart': BarChart, 'layers': Layers, 'link': Link,
  'search': Search, 'upload': Upload,
};

const BRANCH_COLORS = [
  '#e11d48', '#ea580c', '#ca8a04', '#16a34a',
  '#0284c7', '#7c3aed', '#db2777', '#0d9488',
];

// ── Layout constants ──────────────────────────────────────────────────────────

const BRANCH_X = 340;
const LEAF_X = 650;
const NODE_H = 44;
const V_GAP = 8;

function getSubtreeH(node: MindmapNode, depth: number): number {
  if (depth >= 2 || node.children.length === 0) return NODE_H + V_GAP;
  const childrenH = node.children.reduce((s, c) => s + getSubtreeH(c, depth + 1), 0);
  return Math.max(NODE_H + V_GAP, childrenH);
}

// ── Layout builder ────────────────────────────────────────────────────────────

function buildLayout(root: MindmapNode): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  const branches = root.children;
  const half = Math.ceil(branches.length / 2);
  const rightBranches = branches.slice(0, half);
  const leftBranches = branches.slice(half);

  const rightTotalH = rightBranches.reduce((s, b) => s + getSubtreeH(b, 1), 0);
  const leftTotalH = leftBranches.reduce((s, b) => s + getSubtreeH(b, 1), 0);
  const maxH = Math.max(rightTotalH, leftTotalH, 200);
  const rootCY = maxH / 2;

  // Root node
  rfNodes.push({
    id: root.id,
    type: 'mindRoot',
    position: { x: 0, y: rootCY - 30 },
    data: { label: root.label },
  });

  // ── Right branches ──────────────────────────────────────────────────────────
  let curY = rootCY - rightTotalH / 2;
  rightBranches.forEach((branch, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const branchH = getSubtreeH(branch, 1);
    const branchCY = curY + branchH / 2;

    rfNodes.push({
      id: branch.id,
      type: 'mindBranch',
      position: { x: BRANCH_X, y: branchCY - NODE_H / 2 },
      data: { label: branch.label, iconKey: branch.iconKey, color, side: 'right' },
    });
    rfEdges.push({
      id: `e-root-${branch.id}`,
      source: root.id,
      target: branch.id,
      sourceHandle: 'sr',
      targetHandle: 't',
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2.5 },
    });

    const leaves = branch.children ?? [];
    const leavesTotalH = leaves.length * (NODE_H + V_GAP);
    let leafY = branchCY - leavesTotalH / 2;
    leaves.forEach((leaf) => {
      rfNodes.push({
        id: leaf.id,
        type: 'mindLeaf',
        position: { x: LEAF_X, y: leafY },
        data: { label: leaf.label, iconKey: leaf.iconKey, color, side: 'right' },
      });
      rfEdges.push({
        id: `e-${branch.id}-${leaf.id}`,
        source: branch.id,
        target: leaf.id,
        sourceHandle: 's',
        targetHandle: 't',
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.65 },
      });
      leafY += NODE_H + V_GAP;
    });

    curY += branchH;
  });

  // ── Left branches ───────────────────────────────────────────────────────────
  curY = rootCY - leftTotalH / 2;
  leftBranches.forEach((branch, i) => {
    const colorIdx = rightBranches.length + i;
    const color = BRANCH_COLORS[colorIdx % BRANCH_COLORS.length];
    const branchH = getSubtreeH(branch, 1);
    const branchCY = curY + branchH / 2;

    rfNodes.push({
      id: branch.id,
      type: 'mindBranch',
      position: { x: -BRANCH_X, y: branchCY - NODE_H / 2 },
      data: { label: branch.label, iconKey: branch.iconKey, color, side: 'left' },
    });
    rfEdges.push({
      id: `e-root-${branch.id}`,
      source: root.id,
      target: branch.id,
      sourceHandle: 'sl',
      targetHandle: 't',
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2.5 },
    });

    const leaves = branch.children ?? [];
    const leavesTotalH = leaves.length * (NODE_H + V_GAP);
    let leafY = branchCY - leavesTotalH / 2;
    leaves.forEach((leaf) => {
      rfNodes.push({
        id: leaf.id,
        type: 'mindLeaf',
        position: { x: -LEAF_X, y: leafY },
        data: { label: leaf.label, iconKey: leaf.iconKey, color, side: 'left' },
      });
      rfEdges.push({
        id: `e-${branch.id}-${leaf.id}`,
        source: branch.id,
        target: leaf.id,
        sourceHandle: 's',
        targetHandle: 't',
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.65 },
      });
      leafY += NODE_H + V_GAP;
    });

    curY += branchH;
  });

  return { nodes: rfNodes, edges: rfEdges };
}

// ── Custom Nodes ──────────────────────────────────────────────────────────────

const MindRootNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as { label: string };
  return (
    <div style={{
      background: '#1e293b',
      color: '#fff',
      borderRadius: 20,
      padding: '14px 22px',
      minWidth: 160,
      maxWidth: 220,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.4,
      boxShadow: '0 4px 20px rgba(30,41,59,0.35)',
    }}>
      <Handle id="sr" type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="sl" type="source" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      {d.label}
    </div>
  );
};

const MindBranchNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as { label: string; iconKey?: string; color: string; side: 'left' | 'right' };
  const IconComp = (d.iconKey ? ICON_MAP[d.iconKey] : null) ?? Circle;
  const isLeft = d.side === 'left';

  return (
    <div style={{
      background: '#ffffff',
      border: `2px solid ${d.color}`,
      borderRadius: 10,
      padding: '8px 12px',
      minWidth: 160,
      maxWidth: 220,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      flexDirection: isLeft ? 'row-reverse' : 'row',
      boxShadow: `0 2px 10px ${d.color}25`,
    }}>
      {/* target handle — from root */}
      <Handle
        id="t"
        type="target"
        position={isLeft ? Position.Right : Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      {/* source handle — to leaves */}
      <Handle
        id="s"
        type="source"
        position={isLeft ? Position.Left : Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${d.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <IconComp size={15} color={d.color} strokeWidth={1.8} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, color: d.color,
        lineHeight: 1.35, textAlign: isLeft ? 'right' : 'left',
      }}>
        {d.label}
      </span>
    </div>
  );
};

const MindLeafNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as { label: string; iconKey?: string; color: string; side: 'left' | 'right' };
  const IconComp = (d.iconKey ? ICON_MAP[d.iconKey] : null) ?? null;
  const isLeft = d.side === 'left';

  return (
    <div style={{
      background: `${d.color}08`,
      border: `1px solid ${d.color}35`,
      borderLeft: isLeft ? `1px solid ${d.color}35` : `3px solid ${d.color}80`,
      borderRight: isLeft ? `3px solid ${d.color}80` : `1px solid ${d.color}35`,
      borderRadius: 6,
      padding: '6px 10px',
      minWidth: 150,
      maxWidth: 230,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      flexDirection: isLeft ? 'row-reverse' : 'row',
    }}>
      <Handle
        id="t"
        type="target"
        position={isLeft ? Position.Right : Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="s"
        type="source"
        position={isLeft ? Position.Left : Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      {IconComp && (
        <IconComp size={12} color={d.color} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
      )}
      <span style={{
        fontSize: 11, color: '#374151',
        lineHeight: 1.4, textAlign: isLeft ? 'right' : 'left',
      }}>
        {d.label}
      </span>
    </div>
  );
};

const nodeTypes = {
  mindRoot: MindRootNode,
  mindBranch: MindBranchNode,
  mindLeaf: MindLeafNode,
};

// ── Export buttons ────────────────────────────────────────────────────────────

const ExportButtons: React.FC<{ capture: () => Promise<string | null> }> = ({ capture }) => {
  const [busy, setBusy] = useState(false);

  const handlePNG = useCallback(async () => {
    setBusy(true);
    try {
      const url = await capture();
      if (!url) return;
      const a = document.createElement('a'); a.download = 'mindmap.png'; a.href = url; a.click();
    } finally { setBusy(false); }
  }, [capture]);

  const handlePDF = useCallback(async () => {
    setBusy(true);
    try {
      const url = await capture();
      if (!url) return;
      const img = new Image(); img.src = url;
      await new Promise(r => { img.onload = r; });
      const pdf = new jsPDF({ orientation: img.width > img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height] });
      pdf.addImage(url, 'PNG', 0, 0, img.width, img.height);
      pdf.save('mindmap.pdf');
    } finally { setBusy(false); }
  }, [capture]);

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 8 }}>
      {(['PNG', 'PDF'] as const).map(fmt => (
        <button key={fmt} onClick={fmt === 'PNG' ? handlePNG : handlePDF} disabled={busy} style={{
          fontSize: 12, padding: '5px 14px', borderRadius: 8,
          border: '1px solid #e2e8f0', background: busy ? '#f1f5f9' : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 500,
        }}>
          {busy ? '...' : `Export ${fmt}`}
        </button>
      ))}
    </div>
  );
};

// ── Main Canvas ───────────────────────────────────────────────────────────────

interface MindmapTreeCanvasProps {
  tree: MindmapNode;
  onCaptureReady?: (fn: () => Promise<string | null>) => void;
  onPdfReady?: (pdfDataUrl: string) => void;
}

const MindmapTreeCanvasInner: React.FC<MindmapTreeCanvasProps> = ({ tree, onCaptureReady, onPdfReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => buildLayout(tree), [tree]);
  const [rfNodes, , onNodesChange] = useNodesState(layoutNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(layoutEdges);

  const capture = useCallback(async (): Promise<string | null> => {
    fitView({ padding: 0.12, duration: 0 });
    await new Promise(r => setTimeout(r, 180));
    if (!containerRef.current) return null;
    return toPng(containerRef.current, { backgroundColor: '#f8fafc', pixelRatio: 3, cacheBust: true });
  }, [fitView, containerRef]);

  const capturePdf = useCallback(async (): Promise<string | null> => {
    const url = await capture();
    if (!url) return null;
    const img = new Image();
    img.src = url;
    await new Promise(r => { img.onload = r; });
    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height],
    });
    pdf.addImage(url, 'PNG', 0, 0, img.width, img.height);
    return pdf.output('datauristring');
  }, [capture]);

  useEffect(() => {
    onCaptureReady?.(capturePdf);
  }, [onCaptureReady, capturePdf]);

  // Capture PDF ngay khi canvas render xong (500ms để ReactFlow khởi tạo đầy đủ)
  useEffect(() => {
    if (!onPdfReady) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const pdf = await capturePdf();
      if (pdf && !cancelled) onPdfReady(pdf);
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [onPdfReady, capturePdf]);

  return (
    <div>
      <ExportButtons capture={capture} />
      <div ref={containerRef} style={{ width: '100%', height: 680, borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#f8fafc' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          <Controls style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
        </ReactFlow>
      </div>
    </div>
  );
};

export const MindmapTreeCanvas: React.FC<MindmapTreeCanvasProps> = ({ tree, onCaptureReady, onPdfReady }) => (
  <ReactFlowProvider>
    <MindmapTreeCanvasInner tree={tree} onCaptureReady={onCaptureReady} onPdfReady={onPdfReady} />
  </ReactFlowProvider>
);
