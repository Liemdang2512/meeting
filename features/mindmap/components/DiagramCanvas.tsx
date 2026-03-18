import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import type { DiagramResponse, DiagramNode } from '../lib/mindmapSchema';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase, AlertTriangle, DollarSign, CheckCircle, Users, Target, Clock,
  FileText, Settings, Zap, Shield, TrendingUp, Map, List, MessageCircle,
  Calendar, Database, Lock, Star, Flag, Package, Wrench, Globe, Heart, Eye,
  BarChart, Layers, Link, Search, Upload, Circle,
} from 'lucide-react';

// ============================================================
// Icon map (same whitelist as MindmapCanvas)
// ============================================================

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
const DEFAULT_ICON: LucideIcon = Circle;

// ============================================================
// Layout builders
// ============================================================

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/** hub-spoke layout:
 *  - source at x=0, y centered
 *  - intermediates at x=320, stacked vertically (y spaced 120px)
 *  - destination (if any) at x=640, y centered
 */
function buildHubSpokeLayout(diagramNodes: DiagramNode[], diagramEdges: { source: string; target: string }[]): LayoutResult {
  const source = diagramNodes.find(n => n.role === 'source');
  const intermediates = diagramNodes.filter(n => n.role === 'intermediate');
  const destination = diagramNodes.find(n => n.role === 'destination');

  const NODE_HEIGHT = 120;
  const totalIntH = Math.max(1, intermediates.length) * NODE_HEIGHT;
  const centerY = totalIntH / 2 - NODE_HEIGHT / 2;

  const posMap: Record<string, { x: number; y: number }> = {};

  if (source) {
    posMap[source.id] = { x: 0, y: centerY };
  }
  intermediates.forEach((n, i) => {
    posMap[n.id] = { x: 320, y: i * NODE_HEIGHT };
  });
  if (destination) {
    posMap[destination.id] = { x: 640, y: centerY };
  }

  // Fallback: nodes with role 'default' in a hub-spoke get placed at x=320
  const unplaced = diagramNodes.filter(n => !posMap[n.id]);
  unplaced.forEach((n, i) => {
    posMap[n.id] = { x: 320, y: (intermediates.length + i) * NODE_HEIGHT };
  });

  const nodes: Node[] = diagramNodes.map(n => ({
    id: n.id,
    type: 'diagramCard',
    position: posMap[n.id] ?? { x: 0, y: 0 },
    data: n as unknown as Record<string, unknown>,
  }));

  const edges: Edge[] = diagramEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'rgba(60,120,220,0.5)', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

/** linear layout: nodes left→right, x += 280 per node */
function buildLinearLayout(diagramNodes: DiagramNode[], diagramEdges: { source: string; target: string }[]): LayoutResult {
  const nodes: Node[] = diagramNodes.map((n, i) => ({
    id: n.id,
    type: 'diagramCard',
    position: { x: i * 280, y: 0 },
    data: n as unknown as Record<string, unknown>,
  }));

  const edges: Edge[] = diagramEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'rgba(60,120,220,0.5)', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

function buildLayout(diagram: DiagramResponse): LayoutResult {
  if (diagram.layoutType === 'hub-spoke') {
    return buildHubSpokeLayout(diagram.nodes, diagram.edges);
  }
  return buildLinearLayout(diagram.nodes, diagram.edges);
}

// ============================================================
// DiagramCardNode — dark navy card renderer
// ============================================================

const DiagramCardNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as unknown as DiagramNode;
  const IconComp = (d.iconKey ? ICON_MAP[d.iconKey] : null) ?? DEFAULT_ICON;
  const isSource = d.role === 'source';

  const cardStyle: React.CSSProperties = {
    background: 'rgba(10, 20, 50, 0.92)',
    border: isSource
      ? '1px solid rgba(79, 195, 247, 0.6)'
      : '1px solid rgba(60, 120, 220, 0.3)',
    borderRadius: 10,
    padding: '10px 14px',
    minWidth: 200,
    maxWidth: 240,
    boxShadow: isSource
      ? '0 0 16px rgba(79, 195, 247, 0.25), 0 2px 8px rgba(0,0,0,0.5)'
      : '0 0 8px rgba(60, 120, 220, 0.15), 0 2px 6px rgba(0,0,0,0.4)',
    cursor: 'default',
  };

  const iconBoxStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 5,
    background: 'rgba(30, 58, 110, 0.8)',
    flexShrink: 0,
  };

  return (
    <div style={cardStyle}>
      <Handle type="target" position={Position.Left} style={{ background: 'rgba(60,120,220,0.5)', border: 'none', width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: d.subtitle || d.description ? 6 : 0 }}>
        <div style={iconBoxStyle}>
          <IconComp size={14} color="#4fc3f7" strokeWidth={1.8} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
          {d.label}
        </span>
      </div>
      {d.subtitle && (
        <div style={{ fontSize: 10, color: '#4fc3f7', fontFamily: 'monospace', letterSpacing: '0.04em', marginBottom: d.description ? 4 : 0 }}>
          {d.subtitle}
        </div>
      )}
      {d.description && (
        <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.4 }}>
          {d.description}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: 'rgba(60,120,220,0.5)', border: 'none', width: 8, height: 8 }} />
    </div>
  );
};

const nodeTypes = { diagramCard: DiagramCardNode };

// ============================================================
// Export buttons (same pattern as MindmapCanvas, dark background)
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
      backgroundColor: '#070d1c',
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
      a.download = 'diagram.png';
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
      pdf.save('diagram.pdf');
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
            border: '1px solid rgba(60,120,220,0.4)',
            background: busy ? 'rgba(10,20,50,0.5)' : 'rgba(10,20,50,0.8)',
            cursor: busy ? 'not-allowed' : 'pointer',
            color: '#64b5f6',
            fontWeight: 500,
          }}
        >
          {busy ? '...' : `Export ${fmt}`}
        </button>
      ))}
    </div>
  );
};

// ============================================================
// Canvas inner
// ============================================================

interface DiagramCanvasProps {
  diagram: DiagramResponse;
}

const DiagramCanvasInner: React.FC<DiagramCanvasProps> = ({ diagram }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildLayout(diagram),
    [diagram],
  );

  const [rfNodes, , onNodesChange] = useNodesState(layoutNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout changes (new diagram data) into RF state
  const syncedNodes = useMemo(
    () => rfNodes.map(n => layoutNodes.find(x => x.id === n.id) ?? n),
    [layoutNodes, rfNodes],
  );
  const syncedEdges = useMemo(
    () => (rfEdges.length !== layoutEdges.length ? layoutEdges : rfEdges),
    [layoutEdges, rfEdges],
  );

  return (
    <div>
      <ExportButtons containerRef={containerRef} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 640,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#070d1c',
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
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#070d1c' }}
        >
          <Controls style={{ background: 'rgba(10,20,50,0.8)', border: '1px solid rgba(60,120,220,0.3)', borderRadius: 8 }} />
        </ReactFlow>
      </div>
    </div>
  );
};

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ diagram }) => (
  <ReactFlowProvider>
    <DiagramCanvasInner diagram={diagram} />
  </ReactFlowProvider>
);
