import { useState, useEffect, useCallback } from 'react';

export interface ChecklistItem {
  id: string;
  parentId: string | null;
  label: string;
  completed: boolean;
  order: number;
}

const DEFAULT_STORAGE_KEY = 'mindmap_checklist_default';

function getStorageKey(documentId?: string): string {
  if (documentId) return `mindmap_checklist_${documentId}`;
  return DEFAULT_STORAGE_KEY;
}

function loadFromStorage(key: string): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ChecklistItem[];
  } catch {
    return [];
  }
}

function saveToStorage(key: string, items: ChecklistItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage errors (quota exceeded, private mode, etc.)
  }
}

export interface UseChecklistStorageResult {
  items: ChecklistItem[];
  setItems: (items: ChecklistItem[]) => void;
  toggleCompleted: (id: string) => void;
  clearChecklist: () => void;
}

export function useChecklistStorage(documentId?: string): UseChecklistStorageResult {
  const storageKey = getStorageKey(documentId);

  const [items, setItemsState] = useState<ChecklistItem[]>(() =>
    loadFromStorage(storageKey)
  );

  // When documentId changes, reload from storage
  useEffect(() => {
    setItemsState(loadFromStorage(getStorageKey(documentId)));
  }, [documentId]);

  const setItems = useCallback((newItems: ChecklistItem[]) => {
    setItemsState(newItems);
    saveToStorage(getStorageKey(documentId), newItems);
  }, [documentId]);

  const toggleCompleted = useCallback((id: string) => {
    setItemsState(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      saveToStorage(getStorageKey(documentId), updated);
      return updated;
    });
  }, [documentId]);

  const clearChecklist = useCallback(() => {
    setItemsState([]);
    try {
      localStorage.removeItem(getStorageKey(documentId));
    } catch {
      // Ignore storage errors
    }
  }, [documentId]);

  return { items, setItems, toggleCompleted, clearChecklist };
}
