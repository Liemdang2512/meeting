import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { MindmapResponseSchema, toMindmapTree } from '../lib/mindmapSchema';
import type { MindmapNode } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';

const MAX_TEXT_LENGTH = 50_000;

function buildMindmapPrompt(text: string): string {
  return `Bạn là chuyên gia phân tích nội dung. Hãy đọc kỹ văn bản dưới đây và tạo một sơ đồ tư duy (mindmap) thể hiện cấu trúc thông tin một cách rõ ràng, logic.

NHIỆM VỤ:
- Xác định chủ đề trung tâm của toàn bộ văn bản → đặt làm root
- Nhóm nội dung thành các nhánh chính theo các chủ đề/khía cạnh quan trọng nhất — số lượng nhánh tùy theo độ phong phú của nội dung (văn bản ngắn: 3–5 nhánh, văn bản dài/nhiều chủ đề: có thể 8–12 nhánh hoặc hơn)
- Mỗi nhánh chính có thể có nhiều nhánh con tùy mức độ chi tiết của nội dung (không giới hạn cứng, ưu tiên phản ánh đúng thực tế văn bản)
- Label phải ngắn gọn, súc tích (tối đa 10 từ), trích xuất từ nội dung thực tế — KHÔNG tự đặt tiêu đề chung chung như "Nội dung 1"

NGUYÊN TẮC PHÂN NHÁNH:
- Nếu là biên bản/ghi chép cuộc họp: nhánh theo chủ đề thảo luận, quyết định, công việc cần làm
- Nếu là tài liệu kỹ thuật/báo cáo: nhánh theo các mục chính của tài liệu
- Nếu là văn bản tổng hợp: nhánh theo các chủ đề/vấn đề nổi bật

ICON RULE:
- Mỗi nhánh chính và nhánh con (KHÔNG áp dụng cho root) phải có trường "iconKey"
- Chọn iconKey phù hợp nhất với nội dung node từ danh sách sau (chỉ dùng các key trong danh sách):
  briefcase, alert-triangle, dollar-sign, check-circle, users, target, clock,
  file-text, settings, zap, shield, trending-up, map, list, message-circle,
  calendar, database, lock, star, flag, package, tool, globe, heart, eye,
  bar-chart, layers, link, search, upload
- Nếu không có key phù hợp, dùng "list" làm mặc định

CHỈ trả về JSON theo định dạng sau, không thêm bất kỳ nội dung nào khác:
{"root":{"label":"Chủ đề trung tâm","children":[{"label":"Nhánh chính 1","iconKey":"briefcase","children":[{"label":"Chi tiết 1.1","iconKey":"target"},{"label":"Chi tiết 1.2","iconKey":"clock"}]},{"label":"Nhánh chính 2","iconKey":"users","children":[{"label":"Chi tiết 2.1","iconKey":"check-circle"}]}]}}

Văn bản cần phân tích:
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
