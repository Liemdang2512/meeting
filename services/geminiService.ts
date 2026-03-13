
import { GoogleGenAI } from "@google/genai";
import { logTokenUsage } from "./tokenUsageService";
import type { TokenLoggingContext } from "../types";

// Helper function to get API key from localStorage or env
const getApiKey = (): string => {
  // Priority: localStorage > environment variable
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && savedKey.trim().length > 0 && savedKey.trim() !== 'your_gemini_api_key_here') {
    return savedKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey !== 'your_gemini_api_key_here') {
    return envKey;
  }

  throw new Error('API Key chưa được cấu hình. Vui lòng nhập API key trong phần ⚙️ API Key ở góc trên bên phải.');
};


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const getMimeType = (file: File): string => {
  if (file.type) return file.type;

  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/m4a';
    case 'ogg': return 'audio/ogg';
    case 'aac': return 'audio/aac';
    case 'flac': return 'audio/flac';
    case 'mp4': return 'video/mp4';
    case 'm4p': return 'audio/mp4';
    default: return 'audio/mp3';
  }
};

export type AudioLanguage = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'other';

const PROMPT_VI = `
Bạn là chuyên gia phiên âm tiếng Việt. Nhiệm vụ:

1. PHIÊN ÂM NGUYÊN VĂN toàn bộ lời nói. Không tóm tắt, không bỏ sót.

2. XỬ LÝ TIẾNG ANH XEN LẪN:
   - GIỮ NGUYÊN nếu là thuật ngữ kỹ thuật, tên sản phẩm, tên công ty, tên riêng,
     hoặc người nói chủ ý dùng tiếng Anh trong câu tiếng Việt.
   - Ví dụ GIỮ NGUYÊN: API, deploy, sprint, backend, Figma, bug, feature,
     pull request, database, deadline, KPI, OKR, Google Meet, AI, app...
   - KHÔNG dịch sang tiếng Việt những từ này.

3. PHÂN BIỆT NGƯỜI NÓI: Nhận diện và tách ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Trung thực tuyệt đối với nội dung gốc.
`;

const PROMPT_EN = `
Bạn là chuyên gia phiên âm và dịch thuật Anh–Việt. Nhiệm vụ: 

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. QUY TẮC DỊCH:
   - Dịch theo NGHĨA và NGỮ CẢNH, không dịch từng chữ.
   - Giữ nguyên tông giọng người nói (trang trọng / thân mật / kỹ thuật).
   - GIỮ NGUYÊN bằng tiếng Anh: tên riêng, tên công ty, tên sản phẩm, thuật ngữ kỹ thuật
     không có từ tương đương tự nhiên trong tiếng Việt.
   - Ví dụ GIỮ NGUYÊN: API, sprint, backend, Figma, pull request, pipeline, KPI, roadmap...
   - Nếu không nghe rõ hoặc không chắc nghĩa → ghi [không rõ], KHÔNG đoán bừa.

3. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Output bằng tiếng Việt.
`;

const PROMPT_ZH = `
Bạn là chuyên gia phiên âm và dịch thuật Trung–Việt. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. QUY TẮC DỊCH:
   - Dịch theo NGHĨA và NGỮ CẢNH, ưu tiên cách diễn đạt tự nhiên trong tiếng Việt.
   - Giữ nguyên tông giọng người nói (trang trọng / thân mật).
   - Tên người Trung Quốc: ưu tiên đọc theo âm Hán Việt nếu phổ biến (ví dụ: 王伟 → Vương Vĩ),
     hoặc giữ nguyên pinyin nếu là người nổi tiếng quốc tế.
   - Tên công ty, tên sản phẩm quốc tế: giữ nguyên tên tiếng Anh/quốc tế.
   - Thuật ngữ kỹ thuật không có từ tương đương tự nhiên: giữ nguyên hoặc ghi kèm bản gốc.
   - Nếu không nghe rõ → ghi [không rõ], KHÔNG đoán bừa.

3. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật (theo quy tắc trên).

4. ĐỊNH DẠNG: Markdown sạch. Output bằng tiếng Việt.
`;

const PROMPT_KO = `
Bạn là chuyên gia phiên âm và dịch thuật Hàn–Việt. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. QUY TẮC DỊCH:
   - Dịch theo NGHĨA và NGỮ CẢNH, ưu tiên cách diễn đạt tự nhiên trong tiếng Việt.
   - Tiếng Hàn có hệ thống kính ngữ (존댓말 / 반말): phản ánh vào tông giọng dịch
     (trang trọng → "anh/chị ơi, xin vui lòng..." / thân mật → "bạn, mình, cậu...").
   - Tên người Hàn: giữ nguyên tên gốc phiên âm Latin (ví dụ: 김민준 → Kim Min-jun).
   - Tên công ty, tên sản phẩm: giữ nguyên tên quốc tế nếu có, hoặc phiên âm chuẩn.
   - Thuật ngữ tiếng Anh người Hàn đọc theo phiên âm Hàn (예: 미팅, 프로젝트):
     dịch về nghĩa gốc (meeting → cuộc họp, project → dự án).
   - Nếu không nghe rõ → ghi [không rõ], KHÔNG đoán bừa.

3. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Output bằng tiếng Việt.
`;

const PROMPT_JA = `
Bạn là chuyên gia phiên âm và dịch thuật Nhật–Việt. Nhiệm vụ:

1. NGHE VÀ PHIÊN ÂM toàn bộ lời nói NGUYÊN VĂN bằng tiếng Nhật. Không tóm tắt, không bỏ sót.

2. DỊCH SANG TIẾNG VIỆT theo các quy tắc sau:

   a. NGHĨA & NGỮ CẢNH: Dịch theo nghĩa và ngữ cảnh, không bám chữ từng từ.
      Giữ nguyên mức độ chắc chắn của người nói:
      - と思います → "tôi nghĩ là…", "có lẽ…"
      - 〜かもしれません → "có thể…", "có khả năng…"
      - 必ず〜します → "nhất định sẽ…", "chắc chắn sẽ…"

   b. KÍNH NGỮ & TÔNG GIỌNG:
      - Keigo (敬語): dịch bằng giọng trang trọng → "quý công ty, bên anh/chị, chúng tôi, xin, vui lòng…"
      - Thường (普通形) / casual: dịch thân mật, xưng "tôi/anh/em", hạn chế "ạ/dạ" nếu hai bên ngang hàng
      - Khiêm nhường ngữ (謙譲語): thể hiện nhún nhường vừa phải, tránh tự hạ quá nhiều

   c. XƯNG HÔ & CHỦ NGỮ ẨN:
      - Xác định rõ "tôi / chúng tôi / công ty chúng tôi / bên em / phía anh/chị…" theo ngữ cảnh và quan hệ trên–dưới
      - Tiếng Nhật hay lược chủ ngữ → bổ sung vào bản dịch Việt cho rõ ai làm, ai chịu trách nhiệm, ai yêu cầu

   d. TÊN RIÊNG, CÔNG TY, THƯƠNG HIỆU:
      - Tên người Nhật: giữ nguyên thứ tự Họ–Tên (ví dụ: 田中健 → Tanaka Ken)
      - Tên công ty Nhật: giữ nguyên, không dịch (Toyota, Sony, Rakuten…)
      - Bộ phận/phòng ban: dịch sang tiếng Việt (営業部 → phòng kinh doanh; 総務部 → phòng hành chính – tổng vụ)

   e. LOANWORD KATAKANA: Dịch sang nghĩa Việt tự nhiên:
      - ミーティング → cuộc họp, プロジェクト → dự án, コンセンサス → đồng thuận
      - Giữ nguyên nếu là tên riêng sản phẩm/thương hiệu

   f. SỐ LIỆU, THỜI GIAN, ĐƠN VỊ ĐO: Dịch chính xác, quy đổi cách đọc tự nhiên
      - Ví dụ: 2026年3月12日 → "ngày 12 tháng 3 năm 2026"; 3億5千万 → "350 triệu"

   g. THUẬT NGỮ CHUYÊN NGÀNH: Thống nhất cách dịch theo chuyên ngành.
      Lần đầu xuất hiện thuật ngữ mới: ghi "Thuật ngữ (tiếng Nhật/Anh gốc)" để người đọc dễ bám.

   h. KHÔNG NGHE RÕ / KHÔNG CHẮC NGHĨA: Ghi [không rõ], TUYỆT ĐỐI không đoán bừa

   i. TRUNG LẬP NỘI DUNG: Dịch đúng nội dung, không thêm bớt cảm xúc, không đổi giọng điệu

3. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Output bằng tiếng Việt.
`;

const buildPromptOther = (languageName: string) => `
Bạn là chuyên gia phiên âm và dịch thuật ${languageName}–Việt. Nhiệm vụ:

1. NGHE VÀ DỊCH toàn bộ lời nói sang tiếng Việt. Không tóm tắt, không bỏ sót.

2. QUY TẮC DỊCH:
   - Ngôn ngữ nguồn: ${languageName}.
   - Dịch theo NGHĨA và NGỮ CẢNH, ưu tiên cách diễn đạt tự nhiên trong tiếng Việt.
   - Giữ nguyên tông giọng người nói (trang trọng / thân mật).
   - GIỮ NGUYÊN: tên riêng, tên công ty, tên sản phẩm, thuật ngữ kỹ thuật quốc tế.
   - Nếu không nghe rõ hoặc không chắc nghĩa → ghi [không rõ], KHÔNG đoán bừa.

3. PHÂN BIỆT NGƯỜI NÓI: Tách theo giọng nói ("Người nói 1:", "Người nói 2:"...).
   Nếu người nói tự giới thiệu tên → dùng tên thật.

4. ĐỊNH DẠNG: Markdown sạch. Output bằng tiếng Việt.
`;

const getAudioPrompt = (language: AudioLanguage, customLanguage?: string): string => {
  switch (language) {
    case 'vi': return PROMPT_VI;
    case 'en': return PROMPT_EN;
    case 'zh': return PROMPT_ZH;
    case 'ko': return PROMPT_KO;
    case 'ja': return PROMPT_JA;
    case 'other': return buildPromptOther(customLanguage?.trim() || 'ngôn ngữ khác');
  }
};

// Gọi Gemini với file audio + system prompt
const runAudioAgent = async (
  file: File,
  systemPrompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await fileToBase64(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { mimeType: getMimeType(file), data: base64Audio } }] },
    config: { systemInstruction: systemPrompt, temperature: 0.1 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");

  const usage = (response as any).usageMetadata as
    | {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    }
    | undefined;

  if (userId && loggingContext) {
    void logTokenUsage({
      userId,
      feature: loggingContext.feature,
      actionType: loggingContext.actionType,
      model: 'gemini-3-pro-preview',
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      totalTokens:
        usage?.totalTokenCount ??
        (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null),
      metadata: loggingContext.metadata,
    });
  }

  return response.text;
};

// Gọi Gemini chỉ với text (không cần audio)
const runTextAgent = async (
  prompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { temperature: 0.1 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");

  const usage = (response as any).usageMetadata as
    | {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    }
    | undefined;

  if (userId && loggingContext) {
    void logTokenUsage({
      userId,
      feature: loggingContext.feature,
      actionType: loggingContext.actionType,
      model: 'gemini-3-pro-preview',
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      totalTokens:
        usage?.totalTokenCount ??
        (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null),
      metadata: loggingContext.metadata,
    });
  }

  return response.text;
};

// Luồng 1: Phiên âm cơ bản (1 agent)
export const transcribeBasic = async (
  file: File,
  language: AudioLanguage = 'vi',
  customLanguage?: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  try {
    return await runAudioAgent(file, getAudioPrompt(language, customLanguage), loggingContext, userId);
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi xử lý âm thanh.");
  }
};

// Giữ tên cũ để không breaking change ở chỗ khác
export const transcribeAudio = transcribeBasic;

export type DeepProgressCallback = (step: 1 | 2 | 3, label: string) => void;

// Luồng 2: Phiên âm chuyên sâu (3 agent tuần tự)
export const transcribeDeep = async (
  file: File,
  onProgress?: DeepProgressCallback,
  language: AudioLanguage = 'vi',
  customLanguage?: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  try {
    // Agent 1: Phiên âm nguyên văn, giữ ngôn ngữ gốc
    const sourceLangLabel = language === 'other'
      ? (customLanguage?.trim() || 'ngôn ngữ khác')
      : { vi: 'tiếng Việt', en: 'tiếng Anh', zh: 'tiếng Trung', ko: 'tiếng Hàn', ja: 'tiếng Nhật' }[language];
    onProgress?.(1, 'Đang phiên âm nguyên văn...');
    const rawTranscript = await runAudioAgent(
      file,
      `
      Nhiệm vụ DUY NHẤT của bạn: Phiên âm toàn bộ lời nói trong file âm thanh.
      Ngôn ngữ chính trong file: ${sourceLangLabel}.
      - Ghi NGUYÊN VĂN theo ngôn ngữ gốc, KHÔNG dịch bất cứ thứ gì.
      - Phân biệt người nói (Người nói 1, Người nói 2...).
        Nếu người nói tự giới thiệu tên → dùng tên thật.
      - Không bỏ sót bất kỳ đoạn nào dù nhỏ.
      - Định dạng Markdown sạch.
    `,
      loggingContext,
      userId,
    );

    // Agent 2: Dịch & chuẩn hóa ngôn ngữ
    onProgress?.(2, 'Đang dịch và chuẩn hóa ngôn ngữ...');
    const jaTranslationRules = language === 'ja' ? `
      QUY TẮC RIÊNG CHO TIẾNG NHẬT:
      a. NGHĨA & NGỮ CẢNH: Dịch theo nghĩa và ngữ cảnh, không bám chữ từng từ.
         Giữ nguyên mức độ chắc chắn: と思います → "tôi nghĩ là…"; 〜かもしれません → "có thể…"; 必ず → "nhất định sẽ…"
      b. KÍNH NGỮ & TÔNG GIỌNG:
         - Keigo (敬語): dịch trang trọng → "quý công ty, bên anh/chị, xin, vui lòng…"
         - Casual (普通形): dịch thân mật, hạn chế "ạ/dạ" nếu hai bên ngang hàng
         - Khiêm nhường ngữ (謙譲語): thể hiện nhún nhường vừa phải
      c. XƯNG HÔ & CHỦ NGỮ ẨN: Bổ sung chủ ngữ bị lược (ai làm, ai chịu trách nhiệm, ai yêu cầu)
         theo ngữ cảnh và quan hệ trên–dưới
      d. TÊN RIÊNG: Tên người Nhật giữ nguyên thứ tự Họ–Tên (田中健 → Tanaka Ken).
         Tên công ty Nhật giữ nguyên. Bộ phận dịch Việt (営業部 → phòng kinh doanh).
      e. LOANWORD KATAKANA: Dịch nghĩa Việt (ミーティング → cuộc họp, プロジェクト → dự án).
         Giữ nguyên nếu là tên sản phẩm/thương hiệu.
      f. SỐ LIỆU, THỜI GIAN: Dịch chính xác, đọc tự nhiên (2026年3月12日 → "ngày 12 tháng 3 năm 2026")
      g. THUẬT NGỮ: Lần đầu ghi kèm bản gốc nếu cần
      h. TRUNG LẬP: Không thêm bớt cảm xúc, không đổi giọng điệu
    ` : `
      3. GIỮ NGUYÊN: tên riêng, tên công ty, tên sản phẩm, thuật ngữ kỹ thuật quốc tế
         không có từ tương đương tự nhiên trong tiếng Việt.
         Ví dụ GIỮ NGUYÊN: API, deploy, sprint, backend, bug, feature, pull request,
         database, Figma, Google Meet, deadline, KPI, OKR...
    `;
    const translatedTranscript = await runTextAgent(
      `
      Bạn nhận được bản phiên âm nguyên văn bằng ${sourceLangLabel} từ một cuộc họp. Nhiệm vụ:

      1. Dịch toàn bộ nội dung sang tiếng Việt theo NGHĨA và NGỮ CẢNH, không dịch từng chữ.
      2. Giữ nguyên tông giọng người nói (trang trọng / thân mật).
      ${jaTranslationRules}
      4. Nếu không chắc nghĩa → ghi [không rõ], KHÔNG đoán bừa.
      5. Giữ nguyên cấu trúc người nói và format Markdown. Output bằng tiếng Việt.

      Bản phiên âm gốc (${sourceLangLabel}):
      ${rawTranscript}
    `,
      loggingContext,
      userId,
    );

    // Agent 3: Review & kiểm tra ngữ cảnh
    onProgress?.(3, 'Đang kiểm tra và hiệu chỉnh ngữ cảnh...');
    const jaReviewNote = language === 'ja' ? `
      LƯU Ý TIẾNG NHẬT: Kiểm tra thêm:
      - Mức độ chắc chắn (と思います / かもしれません / 必ず) có được dịch đúng sắc thái không
      - Xưng hô và chủ ngữ ẩn có được bổ sung rõ ràng không
      - Kính ngữ có phản ánh đúng tông giọng (trang trọng / thân mật) không
    ` : '';
    const finalTranscript = await runTextAgent(
      `
      Bạn là editor chuyên kiểm tra chất lượng phiên âm và dịch thuật.
      Bạn có hai bản:
      - [GỐC]: Bản phiên âm nguyên văn
      - [ĐÃ DỊCH]: Bản đã qua xử lý ngôn ngữ
      ${jaReviewNote}
      Nhiệm vụ: So sánh từng đoạn và CHỈ SỬA khi:
      - Bản dịch sai nghĩa so với ngữ cảnh gốc
      - Thuật ngữ kỹ thuật bị dịch sai hoặc không cần thiết phải dịch
      - Câu bị mất nghĩa hoặc thêm nghĩa không có trong gốc
      - Tông giọng bị thay đổi không đúng (trang trọng ↔ thân mật)

      KHÔNG thay đổi những gì đã đúng. Chỉ sửa những chỗ sai.

      QUAN TRỌNG VỀ FORMAT OUTPUT:
      - Trả về TRỰC TIẾP nội dung phiên âm, KHÔNG thêm bất kỳ lời mở đầu, nhận xét, hay giải thích nào.
      - KHÔNG viết những câu như "Dưới đây là bản...", "Bản dịch đã tốt...", "Tôi đã chỉnh sửa..." hay bất kỳ commentary nào.
      - Bắt đầu ngay bằng nội dung cuộc họp.

      [GỐC]:
      ${rawTranscript}

      [ĐÃ DỊCH]:
      ${translatedTranscript}
    `,
      loggingContext,
      userId,
    );

    return finalTranscript;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi xử lý âm thanh chuyên sâu.");
  }
};

/**
 * Synthesizes multiple transcriptions from multiple audio files into one coherent document.
 */
export const synthesizeTranscriptions = async (
  transcriptions: { name: string; text: string }[],
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const combined = transcriptions
    .map((t, i) => `## File ${i + 1}: ${t.name}\n\n${t.text}`)
    .join('\n\n---\n\n');

  const prompt = `Dưới đây là văn bản ghi chép từ ${transcriptions.length} file ghi âm của cùng một cuộc họp, theo đúng thứ tự thời gian:

${combined}

---

**YÊU CẦU:** Hãy tổng hợp tất cả các file trên thành MỘT VĂN BẢN DUY NHẤT, liên tục và mạch lạc theo đúng thứ tự thời gian. Các quy tắc bắt buộc:
- KHÔNG ĐƯỢC lược bỏ bất kỳ nội dung, chi tiết, hay đoạn hội thoại nào
- Nếu có phần trùng lặp ở đầu/cuối các file (do ghi âm chồng lên nhau), chỉ giữ lại một lần
- Giữ nguyên tên người nói và định dạng Markdown
- Kết quả phải là một văn bản hoàn chỉnh, liền mạch như thể ghi từ một cuộc họp liên tục`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { temperature: 0.1 },
    });

    if (!response.text) {
      throw new Error("Không nhận được phản hồi khi tổng hợp.");
    }

    const usage = (response as any).usageMetadata as
      | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
      | undefined;

    if (userId && loggingContext) {
      void logTokenUsage({
        userId,
        feature: loggingContext.feature,
        actionType: loggingContext.actionType,
        model: 'gemini-3-pro-preview',
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens:
          usage?.totalTokenCount ??
          (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
            ? usage.promptTokenCount + usage.candidatesTokenCount
            : null),
        metadata: loggingContext.metadata,
      });
    }

    return response.text;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi khi tổng hợp nội dung các file.");
  }
};

/**
 * Generates a summary/meeting minutes from the transcribed text.
 */
export const summarizeTranscript = async (
  transcript: string,
  customPrompt: string,
  loggingContext?: TokenLoggingContext,
  userId?: string | null,
): Promise<string> => {
  // Always create a new instance to use the most up-to-date API key
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Dưới đây là văn bản ghi chép cuộc họp:\n\n${transcript}\n\n--- Yêu cầu: ---\n${customPrompt}`,
      config: {
        temperature: 0.3,
      }
    });

    if (!response.text) {
      throw new Error("Không thể tạo biên bản từ văn bản này.");
    }

    const usage = (response as any).usageMetadata as
      | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
      | undefined;

    if (userId && loggingContext) {
      void logTokenUsage({
        userId,
        feature: loggingContext.feature,
        actionType: loggingContext.actionType,
        model: 'gemini-3-pro-preview',
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens:
          usage?.totalTokenCount ??
          (typeof usage?.promptTokenCount === 'number' && typeof usage?.candidatesTokenCount === 'number'
            ? usage.promptTokenCount + usage.candidatesTokenCount
            : null),
        metadata: loggingContext.metadata,
      });
    }

    return response.text;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi khi tạo biên bản.");
  }
};
