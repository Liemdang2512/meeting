
import { GoogleGenAI } from "@google/genai";

// Helper function to get API key from localStorage or env
const getApiKey = (): string => {
  // Priority: localStorage > environment variable
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && savedKey.trim().length > 0) {
    return savedKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY') {
    return envKey;
  }

  throw new Error('API Key chưa được cấu hình. Vui lòng nhập API key trong cài đặt.');
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

export const transcribeAudio = async (file: File): Promise<string> => {
  // Always create a new instance to use the most up-to-date API key
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const modelId = 'gemini-3-pro-preview';

    const systemPrompt = `
      Bạn là một chuyên gia bóc tách âm thanh và dịch thuật cao cấp sử dụng Gemini 3 Pro. Nhiệm vụ của bạn là:
      
      1. TRÍCH XUẤT TOÀN BỘ: Chuyển đổi toàn bộ lời nói từ file âm thanh thành văn bản (Transcription). KHÔNG ĐƯỢC tóm tắt, lược bỏ hay bỏ qua bất kỳ đoạn hội thoại nào, kể cả những chi tiết nhỏ.
      2. DỊCH SANG TIẾNG VIỆT: Nếu ngôn ngữ trong âm thanh gốc không phải là Tiếng Việt (ví dụ: Tiếng Anh, Tiếng Nhật, Tiếng Trung...), hãy DỊCH TOÀN BỘ nội dung đó sang Tiếng Việt một cách chính xác và trôi chảy.
      3. PHÂN BIỆT NGƯỜI NÓI: Tự động nhận diện và tách biệt các người nói khác nhau (ví dụ: "Người nói 1:", "Người nói 2:",...). Nếu họ tự giới thiệu tên, hãy sử dụng tên của họ.
      4. ĐỊNH DẠNG: Trình bày kết quả bằng Markdown sạch đẹp. Đảm bảo tính trung thực tuyệt đối so với bản gốc.
      
      Hãy bắt đầu xử lý file âm thanh ngay bây giờ:
    `;

    // Convert audio file to base64 for inlineData.
    const base64Audio = await fileToBase64(file);
    const audioPart = {
      inlineData: {
        mimeType: getMimeType(file),
        data: base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [audioPart],
      },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1, // Lower temperature for more accurate transcription/translation
      }
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("Không nhận được phản hồi từ Gemini 3 Pro.");
    }
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_EXPIRED");
    }
    throw new Error(error.message || "Lỗi xử lý âm thanh.");
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
