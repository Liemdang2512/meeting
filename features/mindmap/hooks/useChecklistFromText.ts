import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { ChecklistResponseSchema } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';
import type { ChecklistItem } from './useChecklistStorage';

const MAX_TEXT_LENGTH = 50_000;

function buildChecklistPrompt(input: string): string {
  return `Bạn là chuyên gia phân tích nội dung và lập kế hoạch. Đọc đoạn văn bản dưới đây và tạo một danh sách công việc (checklist) phân cấp rõ ràng.

YÊU CẦU QUAN TRỌNG:
- Chỉ trả về JSON, không thêm text, không thêm markdown hay giải thích nào.
- Mỗi mục (item) có nhãn (label) ngắn gọn, là một công việc hoặc hành động cụ thể.
- Tối đa 2 cấp: mục cha → mục con. Mỗi mục cha tối đa 8 mục con.
- Tổng số mục không quá 50.
- Ngôn ngữ phù hợp với văn bản (tiếng Việt nếu văn bản tiếng Việt).

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
