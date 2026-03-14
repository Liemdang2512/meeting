import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChecklistStorage } from '../hooks/useChecklistStorage';
import type { ChecklistItem } from '../hooks/useChecklistStorage';

const SAMPLE_ITEMS: ChecklistItem[] = [
  { id: 'p1', parentId: null, label: 'Task cha 1', completed: false, order: 0 },
  { id: 'c1', parentId: 'p1', label: 'Task con 1.1', completed: false, order: 1 },
  { id: 'p2', parentId: null, label: 'Task cha 2', completed: true, order: 2 },
];

describe('useChecklistStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty items when nothing in localStorage', () => {
    const { result } = renderHook(() => useChecklistStorage());
    expect(result.current.items).toEqual([]);
  });

  it('loads items from localStorage on init', () => {
    localStorage.setItem('mindmap_checklist_default', JSON.stringify(SAMPLE_ITEMS));
    const { result } = renderHook(() => useChecklistStorage());
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0].label).toBe('Task cha 1');
  });

  it('setItems saves to localStorage and updates state', () => {
    const { result } = renderHook(() => useChecklistStorage());

    act(() => {
      result.current.setItems(SAMPLE_ITEMS);
    });

    expect(result.current.items).toHaveLength(3);

    const stored = JSON.parse(localStorage.getItem('mindmap_checklist_default') ?? '[]');
    expect(stored).toHaveLength(3);
    expect(stored[0].label).toBe('Task cha 1');
  });

  it('toggleCompleted flips completed state and persists', () => {
    const { result } = renderHook(() => useChecklistStorage());

    act(() => {
      result.current.setItems(SAMPLE_ITEMS);
    });

    expect(result.current.items[0].completed).toBe(false);

    act(() => {
      result.current.toggleCompleted('p1');
    });

    expect(result.current.items[0].completed).toBe(true);

    const stored: ChecklistItem[] = JSON.parse(
      localStorage.getItem('mindmap_checklist_default') ?? '[]'
    );
    expect(stored.find(i => i.id === 'p1')?.completed).toBe(true);
  });

  it('toggleCompleted toggles back to false when already true', () => {
    const { result } = renderHook(() => useChecklistStorage());

    act(() => {
      result.current.setItems(SAMPLE_ITEMS);
    });

    // p2 starts completed=true
    act(() => {
      result.current.toggleCompleted('p2');
    });

    expect(result.current.items[2].completed).toBe(false);
  });

  it('clearChecklist empties items and removes from localStorage', () => {
    const { result } = renderHook(() => useChecklistStorage());

    act(() => {
      result.current.setItems(SAMPLE_ITEMS);
    });

    act(() => {
      result.current.clearChecklist();
    });

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem('mindmap_checklist_default')).toBeNull();
  });

  it('uses separate key per documentId', () => {
    const { result: r1 } = renderHook(() => useChecklistStorage('doc-a'));
    const { result: r2 } = renderHook(() => useChecklistStorage('doc-b'));

    act(() => {
      r1.current.setItems([SAMPLE_ITEMS[0]]);
    });

    // doc-b should still be empty
    expect(r2.current.items).toEqual([]);

    // Check different localStorage keys
    expect(localStorage.getItem('mindmap_checklist_doc-a')).toBeTruthy();
    expect(localStorage.getItem('mindmap_checklist_doc-b')).toBeNull();
  });
});
