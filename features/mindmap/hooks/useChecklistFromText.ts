import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { ChecklistResponseSchema } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';
import type { ChecklistItem } from './useChecklistStorage';

const MAX_TEXT_LENGTH = 50_000;

function buildChecklistPrompt(input: string): string {
  return `Tạo checklist công việc từ văn bản. Chỉ trả về JSON hợp lệ, không thêm gì khác.

Định dạng JSON bắt buộc:
{"items":[{"label":"Công việc 1","children":[{"label":"Việc con 1.1"},{"label":"Việc con 1.2"}]},{"label":"Công việc 2","children":[]}]}

Quy tắc: tối đa 2 cấp, mỗi mục cha tối đa 8 mục con, tổng không quá 50 mục. Label ngắn gọn.

Văn bản:
${input}`;
}

/** Convert Gemini hierarchical checklist response to flat ChecklistItem list */
function toFlatChecklist(items: { label: string; children?: { label: string }[] }[]): ChecklistItem[] {
  const flat: ChecklistItem[] = [];
  let order = 0;

  items.forEach((parent, pi) => {
    const parentId = `parent-${pi}`;
    flat.push({
      id: parentId,
      parentId: null,
      label: parent.label,
      completed: false,
      order: order++,
    });

    (parent.children ?? []).forEach((child, ci) => {
      flat.push({
        id: `child-${pi}-${ci}`,
        parentId,
        label: child.label,
        completed: false,
        order: order++,
      });
    });
  });

  return flat;
}

export interface UseChecklistFromTextResult {
  items: ChecklistItem[];
  loading: boolean;
  error: string | null;
  generate: (text: string, userId?: string | null) => Promise<ChecklistItem[]>;
  reset: () => void;
}

export function useChecklistFromText(): UseChecklistFromTextResult {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (text: string, userId?: string | null): Promise<ChecklistItem[]> => {
    if (!text.trim()) {
      setError('Vui lòng nhập nội dung văn bản.');
      return [];
    }

    const truncated = text.length > MAX_TEXT_LENGTH
      ? text.slice(0, MAX_TEXT_LENGTH)
      : text;

    setLoading(true);
    setError(null);
    setItems([]);

    const loggingContext: TokenLoggingContext = {
      feature: 'mindmap',
      actionType: 'checklist-generate',
      metadata: { textLength: truncated.length },
    };

    try {
      const prompt = buildChecklistPrompt(truncated);
      const response = await generateStructured<import('../lib/mindmapSchema').ChecklistResponse>(
        prompt,
        ChecklistResponseSchema,
        loggingContext,
        userId,
      );
      const flat = toFlatChecklist(response.items);
      setItems(flat);
      return flat;
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo checklist.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setLoading(false);
  }, []);

  return { items, loading, error, generate, reset };
}
