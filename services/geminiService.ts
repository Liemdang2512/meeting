
import { GoogleGenAI } from "@google/genai";

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

const BASIC_TRANSCRIBE_PROMPT = `
  Bạn là chuyên gia phiên âm và dịch thuật âm thanh. Nhiệm vụ của bạn:

  1. TRÍCH XUẤT TOÀN BỘ: Ghi lại toàn bộ lời nói, không tóm tắt, không bỏ sót bất kỳ đoạn nào dù nhỏ.

  2. XỬ LÝ NGÔN NGỮ — áp dụng theo từng trường hợp:

     [A] Audio hoàn toàn tiếng Việt:
     → Phiên âm nguyên văn, KHÔNG dịch.

     [B] Audio là ngôn ngữ khác (Anh, Nhật, Trung, v.v.):
     → Dịch sang tiếng Việt theo NGHĨA và NGỮ CẢNH, không dịch từng chữ.
     → Giữ nguyên tông giọng người nói (trang trọng / thân mật).
     → Nếu không chắc nghĩa → ghi [không rõ], KHÔNG đoán bừa.

     [C] Audio xen kẽ tiếng Việt và tiếng Anh (code-switching):
     → GIỮ NGUYÊN tiếng Anh nếu là thuật ngữ kỹ thuật, tên sản phẩm, tên công ty, tên riêng,
       hoặc người nói chủ ý dùng tiếng Anh trong câu tiếng Việt.
     → Ví dụ GIỮ NGUYÊN: API, deploy, sprint, backend, Figma, bug, feature,
       pull request, database, deadline, KPI, OKR, Google Meet...
     → Chỉ dịch sang tiếng Việt khi cả câu hoàn toàn bằng tiếng Anh (người nước ngoài nói).

  3. PHÂN BIỆT NGƯỜI NÓI: Nhận diện và tách các người nói ("Người nói 1:", "Người nói 2:"...).
     Nếu người nói tự giới thiệu tên → dùng tên thật.

  4. ĐỊNH DẠNG: Trình bày bằng Markdown. Trung thực tuyệt đối so với nội dung gốc.
`;

// Gọi Gemini với file audio + system prompt
const runAudioAgent = async (file: File, systemPrompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await fileToBase64(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { mimeType: getMimeType(file), data: base64Audio } }] },
    config: { systemInstruction: systemPrompt, temperature: 0.1 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");
  return response.text;
};

// Gọi Gemini chỉ với text (không cần audio)
const runTextAgent = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { temperature: 0.1 },
  });
  if (!response.text) throw new Error("Không nhận được phản hồi từ Gemini.");
  return response.text;
};

// Luồng 1: Phiên âm cơ bản (1 agent)
export const transcribeBasic = async (file: File): Promise<string> => {
  try {
    return await runAudioAgent(file, BASIC_TRANSCRIBE_PROMPT);
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
  onProgress?: DeepProgressCallback
): Promise<string> => {
  try {
    // Agent 1: Phiên âm nguyên văn, giữ ngôn ngữ gốc
    onProgress?.(1, 'Đang phiên âm nguyên văn...');
    const rawTranscript = await runAudioAgent(file, `
      Nhiệm vụ DUY NHẤT của bạn: Phiên âm toàn bộ lời nói trong file âm thanh.
      - Ghi NGUYÊN VĂN theo ngôn ngữ gốc, KHÔNG dịch bất cứ thứ gì.
      - Phân biệt người nói (Người nói 1, Người nói 2...).
        Nếu người nói tự giới thiệu tên → dùng tên thật.
      - Không bỏ sót bất kỳ đoạn nào dù nhỏ.
      - Định dạng Markdown sạch.
    `);

    // Agent 2: Dịch & chuẩn hóa ngôn ngữ
    onProgress?.(2, 'Đang dịch và chuẩn hóa ngôn ngữ...');
    const translatedTranscript = await runTextAgent(`
      Bạn nhận được bản phiên âm nguyên văn từ một cuộc họp. Nhiệm vụ:

      1. Xác định ngôn ngữ từng đoạn hội thoại.
      2. Áp dụng rule xử lý:
         [A] Tiếng Việt → giữ nguyên, KHÔNG dịch.
         [B] Ngôn ngữ khác (Anh/Nhật/Trung...) → dịch sang tiếng Việt theo nghĩa và ngữ cảnh, không dịch từng chữ.
             Giữ nguyên tông giọng người nói. Nếu không chắc nghĩa → ghi [không rõ].
         [C] Xen kẽ Việt-Anh → GIỮ NGUYÊN thuật ngữ kỹ thuật, tên sản phẩm/công ty/riêng,
             hoặc từ người nói chủ ý dùng tiếng Anh trong câu tiếng Việt.
             Ví dụ GIỮ NGUYÊN: API, deploy, sprint, backend, bug, feature, pull request,
             database, Figma, Google Meet, deadline, KPI, OKR...
             Chỉ dịch khi cả câu hoàn toàn là tiếng Anh của người nước ngoài.
      3. Giữ nguyên cấu trúc người nói và format Markdown.

      Bản phiên âm gốc:
      ${rawTranscript}
    `);

    // Agent 3: Review & kiểm tra ngữ cảnh
    onProgress?.(3, 'Đang kiểm tra và hiệu chỉnh ngữ cảnh...');
    const finalTranscript = await runTextAgent(`
      Bạn là editor chuyên kiểm tra chất lượng phiên âm và dịch thuật.
      Bạn có hai bản:
      - [GỐC]: Bản phiên âm nguyên văn
      - [ĐÃ DỊCH]: Bản đã qua xử lý ngôn ngữ

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
    `);

    return finalTranscript;
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw new Error(error.message || "Lỗi xử lý âm thanh chuyên sâu.");
  }
};

/**
 * Synthesizes multiple transcriptions from multiple audio files into one coherent document.
 */
export const synthesizeTranscriptions = async (transcriptions: { name: string; text: string }[]): Promise<string> => {
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

    if (response.text) return response.text;
    throw new Error("Không nhận được phản hồi khi tổng hợp.");
  } catch (error: any) {
    throw new Error(error.message || "Lỗi khi tổng hợp nội dung các file.");
  }
};

/**
 * Generates a summary/meeting minutes from the transcribed text.
 */
export const summarizeTranscript = async (transcript: string, customPrompt: string): Promise<string> => {
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

    if (response.text) {
      return response.text;
    } else {
      throw new Error("Không thể tạo biên bản từ văn bản này.");
    }
  } catch (error: any) {
    throw new Error(error.message || "Lỗi khi tạo biên bản.");
  }
};
