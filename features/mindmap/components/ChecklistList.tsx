import React, { useState } from 'react';
import type { ChecklistItem } from '../hooks/useChecklistStorage';

interface ChecklistListProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onClear?: () => void;
}

interface TreeNode {
  item: ChecklistItem;
  children: TreeNode[];
}

/** Build a tree from flat list, sorted by order */
function buildTree(items: ChecklistItem[]): TreeNode[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const roots: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  sorted.forEach(item => {
    nodeMap.set(item.id, { item, children: [] });
  });

  sorted.forEach(item => {
    const node = nodeMap.get(item.id)!;
    if (item.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphaned child — show as root
        roots.push(node);
      }
    }
  });

  return roots;
}

interface ChecklistNodeProps {
  node: TreeNode;
  onToggle: (id: string) => void;
  level: number;
}

const ChecklistNode: React.FC<ChecklistNodeProps> = ({ node, onToggle, level }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors group ${level === 0 ? 'font-medium' : 'text-sm text-slate-700'}`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-4 h-4 text-slate-400 hover:text-slate-700 flex-shrink-0 text-xs"
            aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={node.item.completed}
          onChange={() => onToggle(node.item.id)}
          className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0 cursor-pointer"
          aria-label={node.item.label}
        />

        {/* Label */}
        <span
          className={`flex-1 leading-snug cursor-pointer ${node.item.completed ? 'line-through text-slate-400' : ''}`}
          onClick={() => onToggle(node.item.id)}
        >
          {node.item.label}
        </span>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <ul className="mt-0.5">
          {node.children.map(child => (
            <ChecklistNode key={child.item.id} node={child} onToggle={onToggle} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const ChecklistList: React.FC<ChecklistListProps> = ({ items, onToggle, onClear }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        Chưa có checklist. Nhấn "Tạo checklist từ nội dung" để bắt đầu.
      </div>
    );
  }

  const tree = buildTree(items);
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {completedCount}/{totalCount} ({progress}%)
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2"
          >
            Xóa
          </button>
        )}
      </div>

      {/* List */}
      <ul className="space-y-0.5">
        {tree.map(node => (
          <ChecklistNode key={node.item.id} node={node} onToggle={onToggle} level={0} />
        ))}
      </ul>
    </div>
  );
};
