import { useState, useCallback } from 'react';
import { generateStructured } from '../../../services/geminiService';
import { DiagramResponseSchema } from '../lib/mindmapSchema';
import type { DiagramResponse } from '../lib/mindmapSchema';
import type { TokenLoggingContext } from '../../../types';

const MAX_TEXT_LENGTH = 50_000;

function buildDiagramPrompt(text: string): string {
  return `Bạn là chuyên gia phân tích nội dung và thiết kế thông tin trực quan. Hãy đọc văn bản dưới đây và tạo một sơ đồ thông tin (infographic diagram) thể hiện cấu trúc và mối quan hệ giữa các thành phần.

NHIỆM VỤ:
- Xác định chủ đề chính và các thành phần liên quan
- Chọn layout phù hợp nhất:
  * "hub-spoke": khi có 1 trung tâm kết nối tới nhiều thành phần (ví dụ: hệ thống AI, platform với nhiều tính năng, quy trình có nhiều bước song song)
  * "linear": khi có chuỗi sự kiện, bước thực hiện tuần tự, hoặc tiến trình theo thời gian
- Tạo 3–8 nodes phù hợp với nội dung

ĐỊNH DẠNG NODES:
- id: chuỗi slug ngắn tiếng Anh, tối đa 20 ký tự, không có dấu cách, không có dấu tiếng Việt (ví dụ: "ai-core", "user-mgmt", "phase-1")
- label: tên ngắn gọn của node (3–6 từ)
- subtitle: CỤM TỪ NGẮN VIẾT HOA kiểu "KEY: VALUE" — ví dụ "ROLE: MANAGER", "STATUS: ACTIVE", "MODE: EXECUTION", "TYPE: PRIMARY" (tối đa 25 ký tự)
- description: mô tả ngắn 10–20 từ về chức năng/vai trò
- iconKey: chọn từ danh sách: briefcase, alert-triangle, dollar-sign, check-circle, users, target, clock, file-text, settings, zap, shield, trending-up, map, list, message-circle, calendar, database, lock, star, flag, package, tool, globe, heart, eye, bar-chart, layers, link, search, upload
- role:
  * "source": node gốc/trung tâm (chỉ có 1, là hub hoặc điểm bắt đầu)
  * "intermediate": node trung gian (các thành phần chính, branches)
  * "destination": node đích/kết quả cuối (tùy chọn, chỉ có 1)
  * "default": dùng cho layout linear (tất cả nodes đều là default)

ICON RULE: Mỗi node PHẢI có iconKey. Nếu không có key phù hợp, dùng "list".

CHỈ trả về JSON theo định dạng sau, không thêm bất kỳ nội dung nào khác:
{"title":"Tên sơ đồ","layoutType":"hub-spoke","nodes":[{"id":"center","label":"Trung tâm","subtitle":"ROLE: CORE","description":"Mô tả ngắn về node","iconKey":"zap","role":"source"},{"id":"node-1","label":"Thành phần 1","subtitle":"STATUS: ACTIVE","description":"Vai trò của thành phần","iconKey":"users","role":"intermediate"}],"edges":[{"source":"center","target":"node-1"}]}

Văn bản cần phân tích:
${text}`;
}

export interface UseDiagramFromTextResult {
  diagram: DiagramResponse | null;
  loading: boolean;
  error: string | null;
  generate: (text: string, userId?: string | null) => Promise<void>;
  reset: () => void;
}

export function useDiagramFromText(): UseDiagramFromTextResult {
  const [diagram, setDiagram] = useState<DiagramResponse | null>(null);
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
    setDiagram(null);

    const loggingContext: TokenLoggingContext = {
      feature: 'mindmap',
      actionType: 'diagram-generate',
      metadata: { textLength: truncated.length },
    };

    try {
      const prompt = buildDiagramPrompt(truncated);
      const response = await generateStructured<DiagramResponse>(
        prompt,
        DiagramResponseSchema,
        loggingContext,
        userId,
      );
      setDiagram(response);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo sơ đồ.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDiagram(null);
    setError(null);
    setLoading(false);
  }, []);

  return { diagram, loading, error, generate, reset };
}
