import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { MindmapResponseSchema, toMindmapTree } from '../lib/mindmapSchema';
import type { MindmapNode, MindmapResponse } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';

const MAX_TEXT_LENGTH = 50_000;

function buildPrompt(text: string): string {
  return `Bạn là chuyên gia phân tích nội dung. Đọc văn bản và tạo sơ đồ tư duy (mindmap) toàn diện, trích xuất TẤT CẢ thông tin quan trọng.

YÊU CẦU:
- root.label: chủ đề chính, tóm gọn 5-8 từ
- Tạo 5-7 nhánh chính (branches) phủ hết các khía cạnh quan trọng
- Mỗi nhánh: 3-6 nhánh con với thông tin cụ thể (số liệu, tên, sự kiện)
- Mỗi nhánh con có thể có 2-4 lá với chi tiết, con số, tên người/địa điểm cụ thể
- Bao gồm số liệu, ngày tháng, tên riêng, thông số kỹ thuật
- Label tối đa 12 từ, rõ ràng, đầy đủ
- Chọn iconKey phù hợp từ: briefcase, alert-triangle, dollar-sign, check-circle, users, target, clock, file-text, settings, zap, shield, trending-up, map, list, message-circle, calendar, database, lock, star, flag, package, tool, globe, heart, eye, bar-chart, layers, link, search, upload

CHỈ trả về JSON, không thêm gì khác:
{"root":{"label":"Chủ đề chính","children":[{"label":"Nhánh 1","iconKey":"briefcase","children":[{"label":"Chi tiết cụ thể","iconKey":"file-text"},{"label":"Số liệu: X đơn vị"}]},{"label":"Nhánh 2","iconKey":"users","children":[{"label":"Thông tin A"},{"label":"Thông tin B"}]}]}}

Văn bản:
${text}`;
}

export interface UseMindmapTreeResult {
  tree: MindmapNode | null;
  loading: boolean;
  error: string | null;
  generate: (text: string, userId?: string | null) => Promise<void>;
  reset: () => void;
}

export function useMindmapTree(): UseMindmapTreeResult {
  const [tree, setTree] = useState<MindmapNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (text: string, userId?: string | null) => {
    if (!text.trim()) {
      setError('Vui lòng nhập nội dung văn bản.');
      return;
    }

    const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    setLoading(true);
    setError(null);
    setTree(null);

    const loggingContext: TokenLoggingContext = {
      feature: 'mindmap',
      actionType: 'mindmap-generate',
      metadata: { textLength: truncated.length },
    };

    try {
      const response = await generateStructured<MindmapResponse>(
        buildPrompt(truncated),
        MindmapResponseSchema,
        loggingContext,
        userId,
        { useResponseSchema: false },
      );
      setTree(toMindmapTree(response));
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo sơ đồ tư duy.');
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
