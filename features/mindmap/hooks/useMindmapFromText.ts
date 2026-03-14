import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { MindmapResponseSchema, toMindmapTree } from '../lib/mindmapSchema';
import type { MindmapNode } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';

const MAX_TEXT_LENGTH = 50_000;

function buildMindmapPrompt(text: string): string {
  return `Bạn là chuyên gia phân tích nội dung. Đọc đoạn văn bản dưới đây và tạo một sơ đồ tư duy (mindmap) phân cấp rõ ràng.

YÊU CẦU QUAN TRỌNG:
- Chỉ trả về JSON, không thêm text, không thêm markdown hay giải thích nào khác.
- Tối đa 3 cấp: trung tâm (root) → nhánh chính (branch) → nhánh con (sub-branch).
- Root là chủ đề tổng quát của toàn bộ văn bản.
- Mỗi nhánh chính là một ý lớn hoặc chủ đề con quan trọng.
- Mỗi nhánh con là chi tiết, ví dụ, hoặc điểm phụ của nhánh chính đó.
- Tối đa 8 nhánh chính, mỗi nhánh chính tối đa 6 nhánh con.
- Nhãn (label) ngắn gọn, rõ ràng, tiếng Việt hoặc ngôn ngữ phù hợp với văn bản.

Văn bản:
${text}`;
}

export interface UseMindmapFromTextResult {
  tree: MindmapNode | null;
  loading: boolean;
  error: string | null;
  generate: (text: string, userId?: string | null) => Promise<void>;
  reset: () => void;
}

export function useMindmapFromText(): UseMindmapFromTextResult {
  const [tree, setTree] = useState<MindmapNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (text: string, userId?: string | null) => {
    if (!text.trim()) {
      setError('Vui lòng nhập nội dung văn bản.');
      return;
    }

    const truncated = text.length > MAX_TEXT_LENGTH
      ? text.slice(0, MAX_TEXT_LENGTH)
      : text;

    setLoading(true);
    setError(null);
    setTree(null);

    const loggingContext: TokenLoggingContext = {
      feature: 'mindmap',
      actionType: 'mindmap-generate',
      metadata: { textLength: truncated.length },
    };

    try {
      const prompt = buildMindmapPrompt(truncated);
      const response = await generateStructured<import('../lib/mindmapSchema').MindmapResponse>(
        prompt,
        MindmapResponseSchema,
        loggingContext,
        userId,
      );
      const mindmapTree = toMindmapTree(response);
      setTree(mindmapTree);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo mindmap.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTree(null);
    setError(null);
    setLoading(false);
  }, []);

  return { tree, loading, error, generate, reset };
}
